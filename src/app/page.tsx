import { ClosingCta } from "@/components/home/ClosingCta";
import { Curator } from "@/components/home/Curator";
import { Footer } from "@/components/home/Footer";
import { Header } from "@/components/home/Header";
import { Hero } from "@/components/home/Hero";
import { InsideThePortal } from "@/components/home/InsideThePortal";
import { ProductPreview } from "@/components/home/ProductPreview";
import { WhosInTheRoom } from "@/components/home/WhosInTheRoom";

export default function Home() {
  // `landing-dark` pins the whole public site to the stage palette (see
  // globals.css) rather than letting it follow the theme toggle — the page
  // is one continuous dark room, hero to footer.
  return (
    <div className="landing-dark">
      <Header />
      <main>
        <Hero />
        <ProductPreview />
        <InsideThePortal />
        <WhosInTheRoom />
        
        <Curator />
        <ClosingCta />
      </main>
      <Footer />
    </div>
  );
}
