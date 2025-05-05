
// Safely convert user ID from session (string) to database ID (number)
export function safeParseUserId(userId: string | undefined): number | null {
    if (!userId) return null;
  
    try {
      const id = parseInt(userId);
      return isNaN(id) ? null : id;
    } catch {
      return null;
    }
}
