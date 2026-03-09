import { Card } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DollarSign } from "lucide-react"

export default function AffiliateDisclosurePage() {
  const lastUpdated = "January 20, 2025"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2">Affiliate Disclosure</h1>
        <p className="text-muted-foreground">
          Last updated: {lastUpdated}
        </p>
      </div>

      {/* FTC Notice */}
      <Alert className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
        <DollarSign className="h-4 w-4" />
        <AlertDescription>
          <strong>FTC Disclosure:</strong> This page contains affiliate links. We may earn a commission if you sign up or make purchases through our links.
        </AlertDescription>
      </Alert>

      {/* Content */}
      <Card className="p-8">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <h2>1. What Are Affiliate Links?</h2>
          <p>
            Affiliate links are special URLs that track when visitors from our website sign up or make purchases on partner websites.
            If you click an affiliate link and complete an action (e.g., sign up for a poker site), we may earn a commission at no extra cost to you.
          </p>

          <h2>2. Why We Use Affiliate Links</h2>
          <p>
            Templar Archives Index is a free service. Affiliate commissions help us:
          </p>
          <ul>
            <li>Cover server costs (hosting, databases, AI processing)</li>
            <li>Maintain and improve the platform</li>
            <li>Keep the Service free for all users</li>
            <li>Continue developing new features</li>
          </ul>

          <h2>3. Our Affiliate Partners</h2>
          <p>
            We may have affiliate relationships with:
          </p>
          <ul>
            <li><strong>Poker Sites:</strong> GGPoker, PokerStars, 888poker, partypoker, etc.</li>
            <li><strong>Poker Tools:</strong> Training sites, software, tracking tools</li>
            <li><strong>Poker Books & Courses:</strong> Educational materials</li>
            <li><strong>Poker Events:</strong> Live tournament ticket sales</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Note: This list is not exhaustive. Any time you see a link to a poker-related service, assume it may be an affiliate link.
          </p>

          <h2>4. How Commissions Work</h2>
          <p>
            Different partners have different commission structures:
          </p>
          <ul>
            <li><strong>Cost Per Acquisition (CPA):</strong> We earn a one-time payment when you sign up</li>
            <li><strong>Revenue Share:</strong> We earn a percentage of rake/fees you generate (ongoing)</li>
            <li><strong>Hybrid:</strong> Combination of CPA + revenue share</li>
          </ul>
          <p>
            <strong>Important:</strong> You never pay more because of an affiliate link. Prices are the same whether you use our link or visit directly.
            In some cases, our links may provide exclusive bonuses or promotions.
          </p>

          <h2>5. Our Editorial Independence</h2>
          <p>
            We maintain editorial independence in all our content:
          </p>
          <ul>
            <li>Hand history data is objective and not influenced by affiliate relationships</li>
            <li>Search results are based on actual hand data, not commission rates</li>
            <li>Player statistics are unbiased</li>
            <li>Community discussions are user-generated and uncensored (within our <a href="/legal/terms" className="text-primary hover:underline">Terms</a>)</li>
          </ul>
          <p>
            We do NOT:
          </p>
          <ul>
            <li>Hide or manipulate hand data based on affiliate deals</li>
            <li>Recommend services solely because of higher commissions</li>
            <li>Remove negative information about affiliate partners</li>
          </ul>

          <h2>6. FTC Compliance</h2>
          <p>
            In compliance with the <strong>Federal Trade Commission (FTC) 16 CFR Part 255</strong> (Guides Concerning the Use of Endorsements and Testimonials),
            we disclose that:
          </p>
          <ul>
            <li>We receive compensation for affiliate links</li>
            <li>This disclosure appears clearly on pages containing affiliate links</li>
            <li>Our recommendations are based on our honest opinions and research</li>
            <li>Results may vary; we do not guarantee winnings or success</li>
          </ul>

          <h2>7. Where You&apos;ll Find Affiliate Links</h2>
          <p>
            Affiliate links may appear in:
          </p>
          <ul>
            <li>Player profiles (links to poker sites)</li>
            <li>Tournament pages (ticket sales, registration links)</li>
            <li>Community forum posts (user-shared links + our banners)</li>
            <li>Sidebar advertisements</li>
            <li>Newsletter emails (if we send them)</li>
          </ul>

          <h2>8. Your Choice</h2>
          <p>
            Using our affiliate links is entirely optional:
          </p>
          <ul>
            <li>You can visit poker sites directly by typing their URL</li>
            <li>You can use browser extensions to block affiliate tracking (we won&apos;t prevent this)</li>
            <li>You can enjoy all features of Templar Archives Index without clicking any affiliate links</li>
          </ul>
          <p>
            If you appreciate our Service and want to support us, using our affiliate links is a great way to help at no cost to you!
          </p>

          <h2>9. Changes to Partnerships</h2>
          <p>
            Our affiliate partnerships may change over time as we add or remove partners.
            This page will be updated to reflect significant changes.
          </p>

          <h2>10. Questions?</h2>
          <p>
            If you have questions about our affiliate relationships, contact us at:
          </p>
          <ul>
            <li>Email: <a href="mailto:affiliate@templararchives.com">affiliate@templararchives.com</a></li>
          </ul>

          <hr className="my-8" />

          <p className="text-sm text-muted-foreground">
            Thank you for supporting Templar Archives Index! Your use of affiliate links helps us keep the Service free and continuously improving.
          </p>
        </div>
      </Card>
    </div>
  )
}
