export function friendlyAuthError(message) {
  const text = message || "The request could not be completed.";
  if (/invalid login credentials/i.test(text)) {
    return "That email or password was not recognized.";
  }
  if (/email not confirmed/i.test(text)) {
    return "Confirm your email before signing in, or turn off email confirmation in the Supabase project for this classroom demo.";
  }
  if (/already registered|already been registered/i.test(text)) {
    return "An account with that email already exists. Sign in instead.";
  }
  return text;
}
