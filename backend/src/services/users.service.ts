import { supabase } from "../config/supabaseClient.js";

type UpdateProfileInput = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  dob?: string;
};

export async function updateUserProfile(input: UpdateProfileInput) {
  const { userId, firstName, lastName, email, dob } = input;

  // We perform the update and flip the 'profile_completed' flag to true
  const { data, error } = await supabase
    .from("users")
    .update({
      first_name: firstName,
      last_name: lastName,
      email: email,
      date_of_birth: dob,
      profile_completed: true, // This marks the user as 'Returning' for next time
      updated_at: new Date().toISOString(), // Good practice to update the timestamp
    })
    .eq("id", userId)
    .select() // Returns the updated record to confirm success
    .single();

  if (error) {
    console.error("❌ PostgreSQL Update Error:", error.message);
    throw new Error(error.message);
  }

  return data; // Return the updated user object to the controller
}
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('firstName, lastName, email')
    .eq('id', userId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}