import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Accessibility statement — Cybercrime Report & Track",
  description:
    "What we're targeting, what's implemented, and what hasn't been independently verified yet.",
};

const implemented = [
  {
    title: "The 1930 helpline is a real, always-visible tel: link",
    body: "It sits in the page header on every screen and never scrolls away, with a real accessible name (\"Call 1930\"), not an image with no alt text.",
  },
  {
    title: "A skip-to-content link is the first focusable element",
    body: "Tab once on any page and you can jump straight past the header to the main content.",
  },
  {
    title: "lang is set on the <html> element",
    body: "Currently en. When the Hindi locale ships, it switches with the page so screen readers pronounce it correctly.",
  },
  {
    title: "Semantic structure and real landmarks",
    body: "One <main> region, a labelled header, real <button> and <a> elements for anything clickable — built on shadcn/ui's Radix primitives, which give correct roles and keyboard behaviour by default.",
  },
  {
    title: "Visible focus rings everywhere",
    body: "Every interactive element uses focus-visible styling; outline: none is not used anywhere in this codebase.",
  },
  {
    title: "No auto-advancing motion",
    body: "There is no carousel, no auto-playing content, and no countdown timer anywhere in the product. prefers-reduced-motion is respected globally.",
  },
  {
    title: "One viewport tag, zoom never disabled",
    body: "Pinch-zoom and text scaling work normally on every page.",
  },
  {
    title: "Labels are always visible",
    body: "Form fields use real, persistent <label> elements — never a placeholder standing in for a label.",
  },
  {
    title: "No minimum character counts",
    body: "The incident narrative has no minimum length. A character counter, where shown, counts up to a maximum only.",
  },
];

export default function AccessibilityPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-12">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Accessibility statement
        </h1>
        <p className="text-lg text-muted-foreground">
          What we&apos;re building toward, what&apos;s actually implemented, and what we
          haven&apos;t independently verified yet. We&apos;d rather tell you the honest, narrower
          truth than claim a conformance level we haven&apos;t tested.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Our target</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">WCAG 2.1 Level AA</strong>, scoped to the
            journeys we&apos;ve actually shipped — not the whole site, and not a claim we
            haven&apos;t walked ourselves. As of this page, that&apos;s:
          </p>
          <ul className="list-disc pl-5">
            <li>the home page (/)</li>
            <li>the financial-fraud report flow (/report/money)</li>
            <li>complaint tracking (/track and /track/[id])</li>
            <li>this page and the other honesty/help pages (/whats-real, /help/just-happened, /privacy)</li>
          </ul>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          What&apos;s implemented
        </h2>
        {implemented.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle className="text-base">{item.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{item.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          What we have not verified yet
        </h2>
        <p className="text-sm text-muted-foreground">
          This is the part most conformance statements skip. Being honest about it is the point.
        </p>
        <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">No automated accessibility pass (axe, Lighthouse) has been run on these pages yet.</strong>{" "}
            What&apos;s listed above reflects the code as written, not a test run and its results.
          </li>
          <li>
            <strong className="text-foreground">No screen-reader walkthrough has been done yet</strong>{" "}
            of the confirmation screen or the tel:1930 control specifically.
          </li>
          <li>
            <strong className="text-foreground">Colour contrast has not been independently measured</strong>{" "}
            against the shipped tokens in both light and dark mode, beyond being chosen with the
            4.5:1 / 3:1 targets in mind.
          </li>
          <li>
            <strong className="text-foreground">We are not claiming full WCAG 2.1 AA conformance today.</strong>{" "}
            We&apos;re stating the target, what&apos;s built toward it, and what still needs a
            real test pass — which we intend to run and publish results for, including any
            failures, before treating this as a conformance claim.
          </li>
        </ul>
      </div>

      <p className="text-sm text-muted-foreground">
        See{" "}
        <Link href="/whats-real" className="underline underline-offset-2 hover:text-foreground">
          what&apos;s real vs mocked
        </Link>{" "}
        for the rest of this prototype&apos;s honest scope.
      </p>
    </div>
  );
}
