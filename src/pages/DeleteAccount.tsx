import { Link } from "react-router-dom";

export default function DeleteAccount() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="rounded-xl bg-white shadow-sm ring-1 ring-gray-200 p-8">
        <h1 className="text-3xl font-bold text-gray-900 border-b-2 border-gray-200 pb-3 mb-2">
          Delete Your Tashi Account
        </h1>
        <p className="text-sm text-gray-500 mb-2">
          App: <strong>Tashi</strong> &middot; Developer: <strong>Tashi Brakes</strong> &middot; Last updated: 26 April 2026
        </p>

        <p className="mb-8 mt-4">
          This page explains how to request deletion of your Tashi account and the data associated with it.
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">How to request deletion</h2>
          <p className="mb-4">
            Tashi is a private business application used by our authorised Admins, Salesmen, Retailers,
            and Mechanics. Account creation and deletion are handled by Tashi Brakes directly. To delete
            your account, please send us an email and we will process the request.
          </p>
          <ol className="list-decimal pl-6 space-y-3">
            <li>Open your email app.</li>
            <li>
              Send a message to:{" "}
              <a
                href="mailto:tashibrakes@gmail.com?subject=Account%20Deletion%20Request%20-%20Tashi"
                className="text-brand-500 hover:underline"
              >
                tashibrakes@gmail.com
              </a>
            </li>
            <li>
              Use the subject line:{" "}
              <span className="inline-block bg-blue-50 text-blue-700 px-3 py-0.5 rounded-full text-sm font-medium">
                Account Deletion Request - Tashi
              </span>
            </li>
            <li>
              In the message body, include:
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Your full name</li>
                <li>The phone number or email address registered with your Tashi account</li>
                <li>Your role in the App (Admin, Salesman, Retailer, or Mechanic)</li>
                <li>The reason for deletion (optional)</li>
              </ul>
            </li>
            <li>Send the email. We will reply to confirm we received your request.</li>
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Sample email</h2>
          <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm font-mono whitespace-pre-wrap leading-relaxed text-gray-800">
{`To: tashibrakes@gmail.com
Subject: Account Deletion Request - Tashi

Hello Tashi Brakes,

I would like to request the deletion of my Tashi account
and all personal data associated with it.

  Name: [your full name]
  Registered phone / email: [your phone or email]
  Role: [Admin / Salesman / Retailer / Mechanic]

Thank you.`}
          </pre>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">What gets deleted</h2>
          <p className="mb-3">When your request is processed, we will permanently delete:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Your name, phone number, email address, and password.</li>
            <li>Your role assignment and account profile.</li>
            <li>Your QR scan history (for Mechanics).</li>
            <li>Your contact preferences and any device tokens linked to your account.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">What may be retained</h2>
          <p className="mb-3">
            For legal, tax, and accounting purposes, certain business records linked to your account may
            be retained in <strong>anonymised form</strong>, including:
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>Invoice and order records (required by tax law for up to 8 years).</li>
            <li>Outstanding balance ledger entries (until the balance is settled).</li>
            <li>Reward payout records (for tax and audit purposes).</li>
          </ul>
          <p>
            These records will no longer be linked to you personally after your account is deleted.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">How long it takes</h2>
          <p>
            We aim to acknowledge your request within <strong>7 days</strong> and complete the deletion
            within <strong>30 days</strong> of receiving your email. We will send you a confirmation
            email once your account has been deleted.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Questions</h2>
          <p className="mb-2">If you have any questions about deletion or about your data, contact:</p>
          <p>
            <strong>Tashi Brakes</strong><br />
            Email:{" "}
            <a href="mailto:tashibrakes@gmail.com" className="text-brand-500 hover:underline">
              tashibrakes@gmail.com
            </a>
          </p>
        </section>

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
