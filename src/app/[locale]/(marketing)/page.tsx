import { Hero } from "@/features/landing/components/Hero";
import { StorySequence } from "@/features/landing/components/StorySequence";
import { HowItWorks } from "@/features/landing/components/HowItWorks";
import { FinalCta } from "@/features/landing/components/FinalCta";

export default function MarketingPage() {
  return (
    <main>
      <Hero />
      <StorySequence />
      <HowItWorks />
      <FinalCta />
    </main>
  );
}
