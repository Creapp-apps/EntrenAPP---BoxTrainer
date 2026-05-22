import { createClient } from "@supabase/supabase-js";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  const { data, error } = await adminSupabase
    .from("boxes")
    .update({ 
      branding_config: {
        primary_color: "#004de6",
        welcome_message: "Tu mejor versión empieza acá.",
        logo_style: "default"
      }
    })
    .ilike("name", "%wolfpack%");
  
  if (error) console.error("Error updating:", error);
  else console.log("Updated successfully!");
}
run();
