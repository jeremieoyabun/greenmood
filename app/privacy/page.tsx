export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gm-dark via-gm-forest to-gm-dark p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gm-sage/20 flex items-center justify-center">
            <span className="text-gm-sage text-lg font-bold">G</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gm-cream">Greenmood Marketing OS</h1>
            <p className="text-xs text-gm-cream/40">Privacy Policy</p>
          </div>
        </div>

        <div className="bg-white/[0.035] border border-white/[0.08] rounded-2xl p-8 space-y-6 text-sm text-gm-cream/70 leading-relaxed">
          <p className="text-xs text-gm-cream/30">Last updated: March 18, 2026</p>

          <section>
            <h2 className="text-base font-semibold text-gm-cream mb-2">1. Introduction</h2>
            <p>Greenmood Marketing OS ("the Platform") is an internal marketing management tool operated by Greenmood SA, headquartered at Atomiumsquare 1, BP 102 B, 1020 Brussels, Belgium. This privacy policy explains how we collect, use, and protect information when you use our Platform.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gm-cream mb-2">2. Information We Collect</h2>
            <p>When you use the Platform, we may collect:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Account information:</strong> Name, email address, and role within the Greenmood organization.</li>
              <li><strong>Social media data:</strong> When you connect social media accounts (Instagram, TikTok, LinkedIn, Facebook), we access account information, content publishing capabilities, and engagement metrics as authorized by you through each platform's OAuth process.</li>
              <li><strong>Content data:</strong> Marketing content, images, captions, and editorial calendar information created or uploaded within the Platform.</li>
              <li><strong>Usage data:</strong> Login timestamps, feature usage, and session information for security purposes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gm-cream mb-2">3. How We Use Information</h2>
            <p>We use collected information exclusively to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Manage and publish marketing content across Greenmood's social media accounts</li>
              <li>Coordinate editorial planning across regional teams</li>
              <li>Analyze content performance and optimize marketing strategy</li>
              <li>Authenticate authorized team members</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gm-cream mb-2">4. Data Sharing</h2>
            <p>We do not sell, rent, or share personal information with third parties. Data is shared only with:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Social media platforms:</strong> To publish content as authorized by connected account holders.</li>
              <li><strong>Service providers:</strong> Vercel (hosting), Neon (database), and Anthropic (AI processing) — all under strict data processing agreements.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gm-cream mb-2">5. Data Security</h2>
            <p>All data is encrypted in transit (HTTPS/TLS) and at rest. Social media access tokens are stored encrypted on secure servers. Access is restricted to authorized Greenmood team members based on role-based permissions.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gm-cream mb-2">6. Data Retention</h2>
            <p>We retain data for as long as necessary to provide the Platform's services. Social media tokens are refreshed periodically and revoked upon account disconnection. You may request deletion of your data at any time.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gm-cream mb-2">7. Your Rights</h2>
            <p>Under GDPR and applicable data protection laws, you have the right to access, correct, delete, or export your personal data. You may also revoke social media connections at any time through the Platform's Settings page or directly through each social media platform.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gm-cream mb-2">8. Contact</h2>
            <p>For privacy-related inquiries, contact us at:</p>
            <p className="mt-1">
              Greenmood SA<br />
              Atomiumsquare 1, BP 102 B<br />
              1020 Brussels, Belgium<br />
              Email: privacy@greenmood.be
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
