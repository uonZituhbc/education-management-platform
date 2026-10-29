declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

// @ts-ignore Deno resolves npm: specifiers at runtime
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseSecretKey =
      Deno.env.get("SUPABASE_SECRET_KEY") ??
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseSecretKey) {
      throw new Error("Supabase secret key is not configured.");
    }

    const authorization = req.headers.get("Authorization");

    if (!authorization) {
      return new Response(
        JSON.stringify({
          error: "Missing authorization.",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    /*
     * Client representing the currently signed-in user.
     */
    const userClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: authorization,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    /*
     * Privileged server client.
     * The secret key NEVER goes to the browser.
     */
    const adminClient = createClient(
      supabaseUrl,
      supabaseSecretKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    /*
     * Identify the signed-in user.
     */
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          error: "You must be logged in.",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    /*
     * Verify that the caller is an active institution administrator.
     */
    const { data: adminMembership, error: membershipError } =
      await adminClient
        .from("institution_members")
        .select("institution_id, role, is_active")
        .eq("user_id", user.id)
        .eq("role", "institution_admin")
        .eq("is_active", true)
        .maybeSingle();

    if (membershipError) {
      throw membershipError;
    }

    if (!adminMembership) {
      return new Response(
        JSON.stringify({
          error:
            "Only an active institution administrator can create staff accounts.",
        }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const body = await req.json();
    const staffId = body?.staff_id;

    if (!staffId) {
      return new Response(
        JSON.stringify({
          error: "staff_id is required.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    /*
     * Get the staff member.
     */
    const { data: staff, error: staffError } = await adminClient
      .from("staff")
      .select(
        `
        id,
        institution_id,
        user_id,
        full_name,
        email,
        staff_role,
        is_active
        `
      )
      .eq("id", staffId)
      .eq("institution_id", adminMembership.institution_id)
      .maybeSingle();

    if (staffError) {
      throw staffError;
    }

    if (!staff) {
      return new Response(
        JSON.stringify({
          error: "Staff member not found.",
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!staff.is_active) {
      return new Response(
        JSON.stringify({
          error: "This staff member is inactive.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!staff.email) {
      return new Response(
        JSON.stringify({
          error:
            "This staff member does not have an email address. Add an email first.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (staff.user_id) {
      return new Response(
        JSON.stringify({
          error: "This staff member already has an account.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    /*
     * IMPORTANT:
     * This must point to YOUR React application,
     * not directly to Supabase's /auth/v1/callback.
     *
     * Local development:
     * http://localhost:5173/staff/accept-invite
     *
     * Later, change this to your production URL.
     */
    const redirectTo =
        "http://10.21.8.51:5173/staff/accept-invite";

    /*
     * Send official Supabase invitation email.
     */
    const { data: invitedUser, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(
        staff.email,
        {
          data: {
            full_name: staff.full_name,
            staff_id: staff.id,
            institution_id: staff.institution_id,
            staff_role: staff.staff_role,
          },
          redirectTo,
        }
      );

    if (inviteError) {
      throw inviteError;
    }

    if (!invitedUser?.user) {
      throw new Error(
        "The staff account could not be created."
      );
    }

    const authUserId = invitedUser.user.id;
    const now = new Date().toISOString();

    /*
     * Ensure profile exists.
     */
    const { error: profileError } = await adminClient
      .from("profiles")
      .upsert(
        {
          id: authUserId,
          full_name: staff.full_name,
          email: staff.email,
          updated_at: now,
        },
        {
          onConflict: "id",
        }
      );

    if (profileError) {
      throw profileError;
    }

    /*
     * Create staff institution membership.
     */
    const { error: memberError } = await adminClient
      .from("institution_members")
      .upsert(
        {
          user_id: authUserId,
          institution_id: staff.institution_id,
          role: staff.staff_role,
          is_active: true,
        },
        {
          onConflict: "user_id,institution_id",
        }
      );

    if (memberError) {
      throw memberError;
    }

    /*
     * Connect Auth account to staff record.
     */
    const { error: staffUpdateError } = await adminClient
      .from("staff")
      .update({
        user_id: authUserId,
        invited_at: now,
        account_created_at: null,
      })
      .eq("id", staff.id)
      .eq("institution_id", staff.institution_id);

    if (staffUpdateError) {
      throw staffUpdateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Invitation sent to ${staff.email}.`,
        staff_id: staff.id,
        user_id: authUserId,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("invite-staff error:", error);

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});