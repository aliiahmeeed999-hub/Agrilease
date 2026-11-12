// Three-tier elevation system applied as Card className overrides - not a
// change to the Card primitive itself, since that would affect every card in
// the app including pages this design pass doesn't cover. Pick the tier by
// what the card IS, not how it looks: Tier 1 is a page's primary/only
// content (a map, a detail page's main card, the calendar), Tier 2 is a
// secondary/metric card sitting alongside other cards, Tier 3 is a small
// element nested inside a Tier 1/2 card (a stat pill, a list row).
export const CARD_TIER_1 = "rounded-3xl bg-card";
export const CARD_TIER_2 = "rounded-2xl bg-muted/40";
export const CARD_TIER_3 = "rounded-xl bg-card/70 ring-foreground/5";
