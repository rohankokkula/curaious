"use client";

import { CuraiousLogo } from "./CuraiousLogo";

interface StoryChromeProps {
  visible: boolean;
}

export function StoryChrome({ visible }: StoryChromeProps) {
  if (!visible) return null;

  return (
    <div className="story-chrome" aria-hidden>
      <div className="story-chrome-left">
        <CuraiousLogo className="story-chrome-logo" variant="chrome" />
        <p className="story-chrome-tag">PEOPLE × IDEAS × AI</p>
      </div>
      <div className="story-chrome-right">
        <p className="story-chrome-round">Round Feedback</p>
        <p className="story-chrome-sub">Same table. A deeper look.</p>
      </div>
    </div>
  );
}
