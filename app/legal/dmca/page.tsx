import { Card } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function DMCAPolicyPage() {
  const lastUpdated = "January 20, 2025"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2">DMCA Copyright Policy</h1>
        <p className="text-muted-foreground">
          Last updated: {lastUpdated}
        </p>
      </div>

      {/* Legal Disclaimer */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>ACTION REQUIRED:</strong> Register a DMCA Designated Agent with the U.S. Copyright Office ($6/year).
          Replace [PLACEHOLDER] values with actual contact information.
        </AlertDescription>
      </Alert>

      {/* Content */}
      <Card className="p-8">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <h2>1. Overview</h2>
          <p>
            Templar Archives Index respects the intellectual property rights of others and expects our users to do the same.
            In accordance with the Digital Millennium Copyright Act (DMCA), 17 U.S.C. § 512(c),
            we will respond expeditiously to claims of copyright infringement on our Service.
          </p>

          <h2>2. DMCA Safe Harbor</h2>
          <p>
            As a service provider, we qualify for DMCA &quot;safe harbor&quot; protection under 17 U.S.C. § 512(c) because:
          </p>
          <ul>
            <li>We do not have actual knowledge of infringing material</li>
            <li>We do not financially benefit from infringing activity</li>
            <li>Upon receiving proper notification, we act expeditiously to remove or disable access to infringing material</li>
            <li>We have designated an agent to receive DMCA takedown notices</li>
          </ul>

          <h2>3. Fair Use Policy</h2>
          <p>
            We believe our use of poker video content qualifies as Fair Use under 17 U.S.C. § 107:
          </p>
          <ul>
            <li><strong>Purpose:</strong> Educational and transformative (converting video to hand history data)</li>
            <li><strong>Nature:</strong> Published broadcasts, not unpublished works</li>
            <li><strong>Amount:</strong> Limited clips/timestamps, not full broadcasts</li>
            <li><strong>Effect:</strong> Does not substitute for original content; drives traffic to original sources</li>
          </ul>
          <p>
            If you disagree with our Fair Use claims, please contact us using the DMCA process below.
          </p>

          <h2>4. Filing a DMCA Takedown Notice</h2>
          <p>
            If you believe your copyrighted work has been infringed, submit a written notice containing:
          </p>
          <ol>
            <li>
              <strong>Identification of the copyrighted work:</strong>
              <br />
              Describe the work you claim has been infringed, or provide a representative list if multiple works.
            </li>
            <li>
              <strong>Identification of the infringing material:</strong>
              <br />
              Provide the URL or specific location on our Service (e.g., hand ID, video timestamp).
            </li>
            <li>
              <strong>Your contact information:</strong>
              <br />
              Name, address, telephone number, and email address.
            </li>
            <li>
              <strong>Statement of good faith:</strong>
              <br />
              &quot;I have a good faith belief that use of the material is not authorized by the copyright owner, its agent, or the law.&quot;
            </li>
            <li>
              <strong>Statement of accuracy:</strong>
              <br />
              &quot;The information in this notification is accurate, and under penalty of perjury,
              I am the copyright owner or authorized to act on behalf of the owner.&quot;
            </li>
            <li>
              <strong>Physical or electronic signature</strong>
            </li>
          </ol>

          <h3>4.1 Where to Send</h3>
          <div className="bg-muted p-4 rounded-md border my-4">
            <p className="font-semibold mb-2">DMCA Designated Agent:</p>
            <p>
              <strong>Name:</strong> [AGENT NAME]<br />
              <strong>Email:</strong> <a href="mailto:dmca@templararchives.com">dmca@templararchives.com</a><br />
              <strong>Address:</strong> [COMPANY ADDRESS]<br />
              <strong>Phone:</strong> [PHONE NUMBER]
            </p>
          </div>

          <h2>5. Our Response</h2>
          <p>
            Upon receiving a valid DMCA notice, we will:
          </p>
          <ol>
            <li>Remove or disable access to the allegedly infringing material within 24-48 hours</li>
            <li>Notify the user who posted the material</li>
            <li>Provide the user with the DMCA notice (excluding your contact information unless required)</li>
            <li>Inform the user of their right to file a counter-notice</li>
          </ol>

          <h2>6. Filing a DMCA Counter-Notice</h2>
          <p>
            If you believe material was removed in error, you may file a counter-notice containing:
          </p>
          <ol>
            <li>Your name, address, phone number, and email</li>
            <li>Identification of the removed material and its former location</li>
            <li>Statement under penalty of perjury: &quot;I have a good faith belief that the material was removed as a result of mistake or misidentification.&quot;</li>
            <li>Consent to jurisdiction: &quot;I consent to the jurisdiction of the Federal District Court for [DISTRICT], and I will accept service of process from the person who filed the DMCA notice.&quot;</li>
            <li>Physical or electronic signature</li>
          </ol>

          <h3>6.1 Our Response to Counter-Notice</h3>
          <p>
            Upon receiving a valid counter-notice, we will:
          </p>
          <ol>
            <li>Forward it to the original complainant</li>
            <li>Inform them they must file a lawsuit within 10-14 business days to keep the material down</li>
            <li>Restore the material after 10-14 days if no lawsuit is filed</li>
          </ol>

          <h2>7. Repeat Infringer Policy</h2>
          <p>
            In accordance with the DMCA, we will terminate user accounts if we determine (in our sole discretion) that:
          </p>
          <ul>
            <li>The user has been the subject of more than 2 valid DMCA takedowns within a 12-month period</li>
            <li>The user repeatedly posts infringing material despite warnings</li>
          </ul>

          <h2>8. Misrepresentation</h2>
          <p className="bg-red-50 dark:bg-red-950 p-4 rounded-md border border-red-200 dark:border-red-800">
            <strong>Warning:</strong> Under 17 U.S.C. § 512(f), anyone who knowingly materially misrepresents that material is infringing
            (or was removed by mistake) may be liable for damages, including costs and attorney&apos;s fees.
          </p>

          <h2>9. Not Legal Advice</h2>
          <p>
            This page describes our DMCA policy but is not legal advice. For legal questions, consult an attorney.
          </p>

          <h2>10. Contact Us</h2>
          <p>
            For non-DMCA copyright questions, contact us at:
          </p>
          <ul>
            <li>Email: <a href="mailto:legal@templararchives.com">legal@templararchives.com</a></li>
          </ul>

          <hr className="my-8" />

          <p className="text-sm text-muted-foreground">
            For more information on our intellectual property policies, see our{" "}
            <a href="/legal/terms" className="text-primary hover:underline">Terms of Service</a>.
          </p>
        </div>
      </Card>
    </div>
  )
}
