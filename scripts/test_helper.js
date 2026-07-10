// Helper for chronological calculation
const getTimePoint = (dateStr: string, shift: string | null) => {
   let score = new Date(dateStr).getTime();
   if (shift === "AM") score += 1;
   else if (shift === "PM") score += 2;
   else score += 1; // Default to AM
   return score;
}
