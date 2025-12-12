/**
 * Currency conversion utilities
 * Meta API pricing is in USD, but we display in AED (UAE Dirhams)
 */

// Exchange rate: 1 USD = 3.67 AED (approximate, can be updated)
const USD_TO_AED_RATE = 3.67;

/**
 * Convert USD to AED
 */
export function usdToAed(usd: number): number {
  return Number((usd * USD_TO_AED_RATE).toFixed(2));
}

/**
 * Convert AED to USD
 */
export function aedToUsd(aed: number): number {
  return Number((aed / USD_TO_AED_RATE).toFixed(2));
}

/**
 * Format number as AED currency
 */
export function formatAed(amount: number): string {
  return `${usdToAed(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED`;
}

/**
 * Format number as USD currency (for internal use)
 */
export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Get message cost in AED based on category and country
 * Meta pricing varies by category and country, but for simplicity we use average
 * MARKETING messages: ~$0.005 - $0.15 per message depending on country
 * We'll use average of $0.05 for MARKETING
 */
export function getMessageCostAed(category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION' = 'MARKETING'): number {
  // Average costs per message in USD
  const costs: Record<string, number> = {
    MARKETING: 0.05,      // Average $0.05 per message
    UTILITY: 0.005,       // $0.005 per message (cheaper)
    AUTHENTICATION: 0.01, // $0.01 per message
  };
  
  return usdToAed(costs[category] || costs.MARKETING);
}

/**
 * Format message cost display
 */
export function formatMessageCost(category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION' = 'MARKETING'): string {
  const cost = getMessageCostAed(category);
  return `${cost.toFixed(3)} AED`;
}

