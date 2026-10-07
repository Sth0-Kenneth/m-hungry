export const foodRecognitionPrompt =
  "Identify distinct visible foods. Use broad grocery categories. If uncertain, lower confidence rather than inventing.";

export const expirationExtractionPrompt =
  "Extract only visible package dates and nearby Japanese or English label text. Normalize complete dates to YYYY-MM-DD. For month/day without a year set value null, yearMissing true, and provide only a suggestedYear for explicit user confirmation. An expiration date alone never proves food is safe.";

export const receiptExtractionPrompt =
  "Extract supermarket receipt data. Preserve Japanese product text exactly in rawName and provide an English-normalized name when readable. Never invent unreadable store names, dates, prices, totals, or products; return null for uncertain scalar values. Receipts do not normally contain expiration dates.";

export const recipeGenerationPrompt =
  "Create easy recipes using only the supplied inventory for ingredientsUsed. Copy inventory ids exactly. Prioritize earlier expiration dates. Put everything else in missingIngredients. Warn about raw meat, eggs, seafood and declared allergens. Never guarantee that food is safe based only on an expiration date.";

export const recipeSearchPrompt =
  "Search the web for real recipe pages. Return direct original-source URLs, not search pages. Summarize briefly without copying the article. Prefer recipes using the supplied soon-expiring ingredients. Avoid unsafe food advice and flag relevant allergen or raw-food risks.";
