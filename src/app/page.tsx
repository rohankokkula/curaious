import { ClosingCta } from "@/components/home/ClosingCta";
import { Curator } from "@/components/home/Curator";
import { Footer } from "@/components/home/Footer";
import { Header } from "@/components/home/Header";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { ProductPreview } from "@/components/home/ProductPreview";
import { WhatItIs } from "@/components/home/WhatItIs";
import { WhosInTheRoom } from "@/components/home/WhosInTheRoom";
import { WhyItsNotJustSessions } from "@/components/home/WhyItsNotJustSessions";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <ProductPreview />
        <WhatItIs />
        <WhosInTheRoom />
        <HowItWorks />
        <WhyItsNotJustSessions />
        <Curator />
        <ClosingCta />
      </main>
      <Footer />
    </>
  );
}
