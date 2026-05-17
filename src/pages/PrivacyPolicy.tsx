import { Link } from "react-router-dom";

export default function PrivacyPolicy() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-200 p-8">
        <h1 className="text-3xl font-bold text-gray-900 border-b-2 border-gray-200 pb-3 mb-2">
          Privacy Policy for Tashi
        </h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: 26 April 2026</p>

        <p className="mb-4">
          <strong>Tashi Brakes</strong> ("we", "us", "our") operates the <strong>Tashi</strong> mobile
          application (the "App"). This Privacy Policy explains what information we collect, how we use
          it, and the choices you have.
        </p>
        <p className="mb-8">
          By using the App, you agree to the collection and use of information in accordance with this policy.
        </p>

        <Section title="1. Who We Are">
          <p>
            Tashi is a private business application used by Tashi Brakes for our internal sales and loyalty
            operations. The App is intended for our authorised <strong>Admins, Salesmen, Retailers, and
            Mechanics</strong>. It is not a consumer-facing service and is not intended for use by the
            general public or by children.
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm mb-4">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-3 py-2 text-left">Type of data</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Why we collect it</th>
                  <th className="border border-gray-300 px-3 py-2 text-left">Required?</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Name", "To identify you in our records and on bills/orders.", "Required"],
                  ["Email address and/or phone number", "To create your account, sign you in, and contact you about orders or rewards.", "Required"],
                  ["Role (Admin, Salesman, Retailer, Mechanic)", "To show you the screens and features relevant to your role.", "Required"],
                  ["Phone contacts", "Salesmen may use device contacts to quickly add or look up retailer phone numbers when booking orders. Contacts are read locally on your device and are not uploaded to our servers in bulk.", "Optional — only if you grant the contacts permission"],
                  ["Camera", "Used solely to scan product QR codes printed on Tashi disc-pad packaging. We do not record photos or video. Only the decoded QR text is processed.", "Optional — only if you grant the camera permission"],
                  ["App activity", "Orders booked, bills generated, QR scans logged, account balances, and similar business records you create through the App.", "Required"],
                  ["Device and technical data", "Device model, operating system version, app version, crash logs, and basic diagnostics so we can keep the App stable.", "Required"],
                ].map(([type, reason, req]) => (
                  <tr key={type} className="align-top">
                    <td className="border border-gray-300 px-3 py-2 font-medium">{type}</td>
                    <td className="border border-gray-300 px-3 py-2">{reason}</td>
                    <td className="border border-gray-300 px-3 py-2">{req}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="3. How We Use Your Information">
          <ul className="list-disc pl-6 space-y-2">
            <li>To create and manage your Tashi account.</li>
            <li>To let Salesmen book orders, generate bills, and share them via WhatsApp.</li>
            <li>To let Mechanics scan product QR codes and to log scans for our offline reward program (rewards are paid to Mechanics manually, in person, by Tashi Brakes).</li>
            <li>To let Retailers view their booked orders, dispatched orders, and outstanding balances.</li>
            <li>To let Admins manage users, products, and reports.</li>
            <li>To provide customer support and respond to your queries.</li>
            <li>To monitor crashes and improve App performance.</li>
            <li>To comply with our legal and tax obligations.</li>
          </ul>
        </Section>

        <Section title="4. How We Share Your Information">
          <p className="mb-3">
            We <strong>do not sell</strong> your personal information. We share data only with the
            following service providers, strictly to operate the App:
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li><strong>Google Firebase / Firestore / Storage</strong> — to host your account data, orders, and bills securely.</li>
            <li><strong>Google Cloud (App Engine)</strong> — to run our backend API.</li>
            <li><strong>Expo Application Services (EAS)</strong> — to build and distribute the App.</li>
          </ul>
          <p className="mb-3">
            We may also disclose information if required by law, court order, or a valid request from a government authority.
          </p>
          <p>
            When you tap the "Share via WhatsApp" button on a bill, the bill leaves the App through
            Android's standard share menu. Anything you choose to send via WhatsApp is then handled by
            WhatsApp under their own privacy policy.
          </p>
        </Section>

        <Section title="5. Data Security">
          <p className="mb-3">
            All data sent between the App and our servers is <strong>encrypted in transit using HTTPS</strong>.
            Stored data is protected by Google Firebase security rules and access controls. Passwords are
            stored as one-way hashes; we cannot read your password.
          </p>
          <p>
            While we take reasonable steps to protect your data, no method of transmission or storage on the
            internet is 100% secure.
          </p>
        </Section>

        <Section title="6. Data Retention">
          <p>
            We keep your account information and business records for as long as your account is active and
            for as long as we are required to retain them under applicable tax, accounting, and commercial
            laws (typically up to 8 years for invoice-related records). When you ask us to delete your
            account, we will remove your personal profile data; certain financial records may be retained
            in anonymised form to satisfy legal obligations.
          </p>
        </Section>

        <Section title="7. Your Rights and Choices">
          <p className="mb-3">You may:</p>
          <ul className="list-disc pl-6 space-y-2 mb-3">
            <li>Ask us what personal data we hold about you.</li>
            <li>Ask us to correct inaccurate personal data.</li>
            <li>
              Ask us to delete your account and personal data — see our{" "}
              <Link to="/delete-account" className="text-brand-500 hover:underline">
                Account Deletion page
              </Link>.
            </li>
            <li>
              Withdraw the camera or contacts permission at any time from your device's
              Settings &gt; Apps &gt; Tashi &gt; Permissions.
            </li>
          </ul>
          <p>
            To exercise any of these rights, email us at{" "}
            <a href="mailto:tashibrakes@gmail.com" className="text-brand-500 hover:underline">
              tashibrakes@gmail.com
            </a>.
          </p>
        </Section>

        <Section title="8. Children's Privacy">
          <p>
            Tashi is a workforce tool for adults (18+). We do not knowingly collect data from anyone under
            18. If you believe a minor has used the App, please contact us and we will delete the data.
          </p>
        </Section>

        <Section title="9. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. The "Last updated" date at the top of
            this page will reflect the latest revision. Continued use of the App after changes are posted
            means you accept the updated policy.
          </p>
        </Section>

        <Section title="10. Contact Us">
          <p className="mb-1">If you have any questions about this Privacy Policy or your data, please email:</p>
          <p>
            <strong>Tashi Brakes</strong><br />
            Email:{" "}
            <a href="mailto:tashibrakes@gmail.com" className="text-brand-500 hover:underline">
              tashibrakes@gmail.com
            </a>
          </p>
        </Section>

        <div className="mt-10 pt-5 border-t border-gray-200 text-sm text-gray-500 text-center">
          &copy; Tashi Brakes &middot;{" "}
          <Link to="/policy" className="text-brand-500 hover:underline">Privacy Policy</Link>
          {" "}&middot;{" "}
          <Link to="/delete-account" className="text-brand-500 hover:underline">Delete Account</Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold text-gray-800 mt-8 mb-3">{title}</h2>
      {children}
    </section>
  );
}
