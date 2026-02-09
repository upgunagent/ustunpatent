
// Basic regex cleaning for PatentCan messages
// Removes n8n logs, JSON artifacts, and timestamps

export const cleanContent = (text: string) => {
    if (!text) return "";

    const cleaned = text
        // Remove n8n specific logs (entire blocks)
        .replace(/\[Used tools:.*?\]/g, "")
        .replace(/\[Hostname=.*?\]/g, "")
        .replace(/\[info@.*?\]/g, "")
        .replace(/Response: \{.*?\}/g, "")
        .replace(/\[.*?@.*?\]/g, "")
        // Catch "Tool: ... Result: ]" pattern including leftovers
        .replace(/Tool:.*?Result:\s*\]?\s*/g, "")
        // Remove "rejected" JSON fragments
        .replace(/.*?\"rejected\":.*?\}\];?/g, "")
        // Remove timestamp logs (with or without opening bracket)
        .replace(/\[?today=.*?\]/g, "")
        // Remove JSON artifacts
        .replace(/^"|"$/g, "")
        .replace(/^\["|"\]$/g, "")
        // Remove leftover commas from JSON arrays
        .replace(/^,|,$/g, "")
        // Aggressively remove leading/trailing brackets, spaces, and common log prefixes
        .replace(/^[\s\]]+|[\s\]]+$/g, "")
        // formatting bold text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // formatting italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>');

    return cleaned.trim();
};

export const extractDateFromContent = (content: string): string | null => {
    if (!content) return null;
    const dateMatch = content.match(/\[today=(.*?)\]/);
    if (dateMatch && dateMatch[1]) {
        return dateMatch[1];
    }
    return null;
};
