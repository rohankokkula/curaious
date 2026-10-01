import { FileText, MessageCircleQuestion, PenLine, ShieldCheck } from "lucide-react";
import { GuidesTabs, type GuideItem } from "@/components/dashboard/GuidesTabs";
import { RATING_PARAMETERS } from "@/lib/ratings";
import { pageMetadata } from "@/lib/og/metadata";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata("resources", { title: "Resources" });

const GUIDES: GuideItem[] = [
  {
    id: "deck-template",
    icon: <PenLine className="size-4.5" />,
    title: "Deck template",
    description: "A starting outline for your talk slides, as a real 16:9 slide deck you can open and edit.",
    downloads: [
      { label: "Plain-text outline (.md)", href: "/resources/deck-template.md" },
    ],
    body: (
      <>
        <div className="not-prose -mx-5 -mt-5 overflow-hidden rounded-t-xl border-b border-border sm:mx-0 sm:mt-0 sm:rounded-xl sm:border">
          <div className="relative aspect-video w-full bg-surface">
            <iframe
              src="https://docs.google.com/presentation/d/e/2PACX-1vQMVjfDlMMy52ovcyWmf0IHQ2KuzlBdwPEbhM6mQTWW0J_fD08ybZiXmu9ajBYErqQyUBidDEtspp__/pubembed?start=false&loop=false&delayms=3000"
              className="absolute inset-0 size-full"
              allowFullScreen
            />
          </div>
        </div>
        <p>
          <a
            href="https://docs.google.com/presentation/d/e/2PACX-1vQMVjfDlMMy52ovcyWmf0IHQ2KuzlBdwPEbhM6mQTWW0J_fD08ybZiXmu9ajBYErqQyUBidDEtspp__/pub?start=false&loop=false&delayms=3000"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-foreground underline underline-offset-2"
          >
            Open in Google Slides
          </a>{" "}
          to make your own copy (File → Make a copy), then edit it there.
        </p>
        <p>
          The template has 12 slides laid out: title, agenda, the problem, context, four
          slides for the core of your talk, the honest &ldquo;what went wrong&rdquo; slide, key takeaways,
          resources, and a closing slide. Replace the placeholder text on each one.
        </p>
        <ol>
          <li><strong>Title</strong>: talk title, your name, date.</li>
          <li><strong>Agenda</strong>: 3–4 bullets on what you&rsquo;ll cover.</li>
          <li><strong>The problem</strong>: what you&rsquo;re solving and why it matters.</li>
          <li><strong>Context / background</strong>: just enough for everyone to follow.</li>
          <li><strong>The core</strong>: your approach, method or build. Prefer screenshots and demos over walls of text.</li>
          <li><strong>What went wrong / what you&rsquo;d do differently</strong>: usually the most useful slide in the room.</li>
          <li><strong>Key takeaways</strong>: 3 bullets max.</li>
          <li><strong>Resources / links</strong>: anything you referenced.</li>
          <li><strong>Thank you / Q&amp;A</strong>: contact info if you&rsquo;re open to follow-ups.</li>
        </ol>
      </>
    ),
  },
  {
    id: "submission-guidelines",
    icon: <FileText className="size-4.5" />,
    title: "Submission guidelines",
    description: "What a good title and description look like, and how the review process works.",
    body: (
      <>
        <h4>Title</h4>
        <p>4–140 characters. Say what the talk is about, not just the topic: &ldquo;Building AI Agents for Real-World Use Cases&rdquo; beats &ldquo;AI Agents&rdquo;.</p>
        <h4>Description</h4>
        <p>40–2000 characters. Cover what you&rsquo;ll walk through and what people should take away. This is what the curator reviews before approving your slot.</p>
        <h4>Deck</h4>
        <p>PDF only, up to 25MB, ideally 16:9. No confidential information.</p>
        <h4>Review</h4>
        <p>The curator approves or sends back your submission with a reason. Your name stays off the public schedule until it&rsquo;s approved.</p>
      </>
    ),
  },
  {
    id: "code-of-conduct",
    icon: <ShieldCheck className="size-4.5" />,
    title: "Code of conduct",
    description: "How we keep sessions respectful and feedback constructive.",
    body: (
      <ul>
        <li>Be on time, and give the presenter your attention.</li>
        <li>Critique the work, not the person. Feedback is attributed, and it&rsquo;s read by a real person.</li>
        <li>No recording or sharing a deck outside the cohort without the presenter&rsquo;s OK.</li>
        <li>Disagree openly, but keep it about the ideas.</li>
        <li>If something feels off, tell the curator.</li>
      </ul>
    ),
  },
  {
    id: "giving-good-feedback",
    icon: <MessageCircleQuestion className="size-4.5" />,
    title: "Giving good feedback",
    description: "A short guide to writing feedback that's specific, kind, and useful.",
    body: (
      <>
        <p>Your feedback covers five things:</p>
        <ul>
          {RATING_PARAMETERS.map((p) => (
            <li key={p.key}><strong>{p.label}</strong>: {p.hint}</li>
          ))}
        </ul>
        <h4>In the comment box</h4>
        <p>Be specific: name one thing that worked and one thing that would make it better next time. Skip generic praise: &ldquo;great talk&rdquo; helps no one, &ldquo;the demo made the tradeoff click&rdquo; does.</p>
      </>
    ),
  },
];

export default function ResourcesPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Resources</h1>
        <p className="mt-1 text-muted">Guides for presenting and giving feedback.</p>
      </header>

      <GuidesTabs items={GUIDES} />
    </div>
  );
}
