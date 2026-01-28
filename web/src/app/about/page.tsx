// ==============================================================================
// file_id: SOM-SCR-0026-v1.0.0
// name: page.tsx
// description: About page with app features and data schema documentation
// project_id: HIPPOCRATIC
// category: script
// tags: [web, nextjs, documentation, schema]
// created: 2026-01-28
// version: 1.0.0
// ==============================================================================

import Link from "next/link";

export const metadata = {
  title: "About — Hippocratic",
  description: "California Healthcare Fraud Detection Platform - Documentation and Schema",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Top Navigation Bar */}
      <div className="bg-zinc-900/95 backdrop-blur border-b border-zinc-700 sticky top-0 z-50">
        <div className="px-3 py-2 flex items-center gap-2 overflow-x-auto">
          <Link
            href="/"
            className="flex-shrink-0 px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium"
          >
            🗺️ Map
          </Link>
          <Link
            href="/explorer"
            className="flex-shrink-0 px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium"
          >
            📊 Explorer
          </Link>
          <Link
            href="/network"
            className="flex-shrink-0 px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium"
          >
            🕸️ Network
          </Link>
          <Link
            href="/stacked"
            className="flex-shrink-0 px-3 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium"
          >
            ⚠️ Fraud
          </Link>
          <Link
            href="/about"
            className="flex-shrink-0 px-3 py-1 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
          >
            ℹ️ About
          </Link>
        </div>
      </div>

      {/* Page Header */}
      <header className="bg-zinc-900/50 backdrop-blur border-b border-zinc-800">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div>
            <h1 className="text-sm sm:text-base font-bold text-white">Hippocratic</h1>
            <p className="text-[10px] sm:text-xs text-zinc-400">CA Healthcare Fraud Detection</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-8 sm:space-y-12">
        {/* Overview */}
        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Overview</h2>
          <div className="prose prose-invert max-w-none">
            <p className="text-zinc-300 text-base sm:text-lg leading-relaxed">
              Hippocratic is a California healthcare facility fraud detection platform that analyzes
              licensing data to identify suspicious patterns such as facilities sharing addresses,
              phone numbers, owners, or administrators. The platform provides interactive mapping,
              data exploration, and field observation tools.
            </p>
          </div>
        </section>

        {/* Features */}
        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Features</h2>
          <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
            {[
              {
                title: "Interactive Map",
                desc: "View all 15,743 California healthcare facilities on an interactive map with color-coded markers for duplicate detection.",
                color: "blue",
              },
              {
                title: "Duplicate Detection",
                desc: "Automatically detects facilities sharing addresses, phone numbers, business owners, or administrators.",
                color: "amber",
              },
              {
                title: "Stacked Facilities",
                desc: "Identifies multiple facilities registered at the same physical address (potential fraud indicator).",
                color: "purple",
              },
              {
                title: "Financial Data",
                desc: "Integrates HCAI utilization and revenue data to identify high-revenue facilities and those with negative income.",
                color: "green",
              },
              {
                title: "Field Observations",
                desc: "Record on-site observations with a checklist (signage, open status, staff presence) and star ratings.",
                color: "cyan",
              },
              {
                title: "Data Explorer",
                desc: "Full-featured data table with sorting, filtering, and export capabilities.",
                color: "pink",
              },
            ].map((f) => (
              <div
                key={f.title}
                className={`p-3 sm:p-4 rounded-xl border bg-zinc-900/50 border-zinc-800 hover:border-${f.color}-500/50 transition-colors`}
              >
                <h3 className="font-semibold text-white mb-1.5 sm:mb-2 text-sm sm:text-base">{f.title}</h3>
                <p className="text-xs sm:text-sm text-zinc-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Data Schema */}
        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Data Schema</h2>
          <p className="text-sm sm:text-base text-zinc-400 mb-4 sm:mb-6">
            The platform uses the following data structures to store and analyze facility information.
          </p>

          {/* Facility Schema */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-semibold text-blue-400 mb-2 sm:mb-3">Facility Record</h3>
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-x-auto">
              <table className="w-full text-xs sm:text-sm min-w-[600px]">
                <thead className="bg-zinc-800/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-zinc-300 font-medium">Field</th>
                    <th className="text-left px-4 py-3 text-zinc-300 font-medium">Type</th>
                    <th className="text-left px-4 py-3 text-zinc-300 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {[
                    ["id", "string", "Unique facility identifier"],
                    ["name", "string", "Facility name"],
                    ["licenseNumber", "string", "State license number"],
                    ["categoryCode", "string", "Facility type code (e.g., HHA, HSP)"],
                    ["categoryName", "string", "Full category name (e.g., HOME HEALTH AGENCY)"],
                    ["address", "string", "Street address"],
                    ["city", "string", "City name"],
                    ["state", "string", "State code (CA)"],
                    ["zip", "string", "ZIP code"],
                    ["county", "string", "County name"],
                    ["phone", "string", "Contact phone number"],
                    ["lat", "number", "Latitude coordinate"],
                    ["lng", "number", "Longitude coordinate"],
                    ["inService", "boolean", "Whether facility is currently in service"],
                    ["businessName", "string", "Owner/licensee business name"],
                    ["contactEmail", "string", "Administrator contact email"],
                    ["licenseStatus", "string", "Current license status"],
                    ["licenseEffectiveDate", "string", "License effective date"],
                    ["licenseExpirationDate", "string", "License expiration date"],
                  ].map(([field, type, desc]) => (
                    <tr key={field} className="hover:bg-zinc-800/30">
                      <td className="px-2 sm:px-4 py-1.5 sm:py-2 font-mono text-amber-400">{field}</td>
                      <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-zinc-500">{type}</td>
                      <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-zinc-400">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Data Schema */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-semibold text-green-400 mb-2 sm:mb-3">Financial Data (HCAI 2024)</h3>
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-x-auto">
              <table className="w-full text-xs sm:text-sm min-w-[600px]">
                <thead className="bg-zinc-800/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-zinc-300 font-medium">Field</th>
                    <th className="text-left px-4 py-3 text-zinc-300 font-medium">Type</th>
                    <th className="text-left px-4 py-3 text-zinc-300 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {[
                    ["facNo", "string", "HCAI facility number"],
                    ["facName", "string", "Facility name in HCAI records"],
                    ["licenseNo", "string", "License number for matching"],
                    ["hhahMediCalVisits", "number", "Home Health Medi-Cal visits"],
                    ["hhahMedicareVisits", "number", "Home Health Medicare visits"],
                    ["hospiceMediCalPatients", "number", "Hospice Medi-Cal patient count"],
                    ["hospiceMedicarePatients", "number", "Hospice Medicare patient count"],
                    ["hospiceMediCalRevenue", "number", "Hospice Medi-Cal revenue ($)"],
                    ["hospiceMedicareRevenue", "number", "Hospice Medicare revenue ($)"],
                    ["hospiceTotalRevenue", "number", "Total hospice revenue ($)"],
                    ["hospiceNetIncome", "number", "Net income (can be negative)"],
                  ].map(([field, type, desc]) => (
                    <tr key={field} className="hover:bg-zinc-800/30">
                      <td className="px-2 sm:px-4 py-1.5 sm:py-2 font-mono text-green-400">{field}</td>
                      <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-zinc-500">{type}</td>
                      <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-zinc-400">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Duplicate Detection Schema */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-semibold text-amber-400 mb-2 sm:mb-3">Duplicate Detection</h3>
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-3 sm:p-4">
              <p className="text-sm sm:text-base text-zinc-400 mb-3 sm:mb-4">
                The system detects four types of duplicates by normalizing and comparing field values:
              </p>
              <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                {[
                  {
                    type: "Address",
                    color: "amber",
                    desc: "Facilities sharing the same street address (normalized)",
                    example: "123 Main St, Los Angeles",
                  },
                  {
                    type: "Phone",
                    color: "purple",
                    desc: "Facilities sharing the same phone number (digits only)",
                    example: "(800) 555-1234 → 8005551234",
                  },
                  {
                    type: "Owner",
                    color: "cyan",
                    desc: "Facilities with the same business/licensee name",
                    example: "ABC Healthcare LLC",
                  },
                  {
                    type: "Admin",
                    color: "pink",
                    desc: "Facilities with the same administrator email",
                    example: "admin@example.com",
                  },
                ].map((d) => (
                  <div key={d.type} className={`p-2.5 sm:p-3 rounded-lg bg-${d.color}-500/10 border border-${d.color}-500/30`}>
                    <div className={`font-semibold text-${d.color}-400 mb-1 text-sm sm:text-base`}>{d.type} Duplicates</div>
                    <p className="text-xs sm:text-sm text-zinc-400 mb-1.5 sm:mb-2">{d.desc}</p>
                    <code className="text-[10px] sm:text-xs bg-zinc-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-zinc-300 break-all">{d.example}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Observation Schema */}
          <div className="mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-semibold text-cyan-400 mb-2 sm:mb-3">Field Observation Record</h3>
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-x-auto">
              <table className="w-full text-xs sm:text-sm min-w-[600px]">
                <thead className="bg-zinc-800/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-zinc-300 font-medium">Field</th>
                    <th className="text-left px-4 py-3 text-zinc-300 font-medium">Type</th>
                    <th className="text-left px-4 py-3 text-zinc-300 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {[
                    ["facilityId", "string", "Reference to facility"],
                    ["rating", "number | null", "1-5 star rating"],
                    ["signagePresent", "yes/no/unknown", "Is signage visible at location?"],
                    ["appearsOpen", "yes/no/unknown", "Does facility appear to be open?"],
                    ["doorLocked", "yes/no/unknown", "Is the door locked during business hours?"],
                    ["staffedObserved", "yes/no/unknown", "Were staff members observed?"],
                    ["clientsObserved", "yes/no/unknown", "Were clients/patients observed?"],
                    ["notes", "string", "Free-form observation notes"],
                    ["updatedAt", "string (ISO)", "Last update timestamp"],
                  ].map(([field, type, desc]) => (
                    <tr key={field} className="hover:bg-zinc-800/30">
                      <td className="px-2 sm:px-4 py-1.5 sm:py-2 font-mono text-cyan-400">{field}</td>
                      <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-zinc-500">{type}</td>
                      <td className="px-2 sm:px-4 py-1.5 sm:py-2 text-zinc-400">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 mt-2 sm:mt-3 px-2 sm:px-0">
              * Observations are stored locally in the browser (localStorage) and are not synced to a server.
            </p>
          </div>
        </section>

        {/* Data Sources */}
        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Data Sources</h2>
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 sm:p-6 space-y-3 sm:space-y-4">
            <div>
              <h3 className="font-semibold text-white mb-1 text-sm sm:text-base">California Department of Public Health (CDPH)</h3>
              <p className="text-xs sm:text-sm text-zinc-400">
                Facility licensing data including addresses, phone numbers, owners, and license status.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1 text-sm sm:text-base">HCAI (Health Care Access and Information)</h3>
              <p className="text-xs sm:text-sm text-zinc-400">
                Financial and utilization data for home health agencies and hospices (2024).
              </p>
            </div>
          </div>
        </section>

        {/* Statistics */}
        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Current Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
            {[
              { label: "Total Facilities", value: "15,743", color: "blue" },
              { label: "Active", value: "14,004", color: "green" },
              { label: "Stacked Locations", value: "1,106", color: "amber" },
              { label: "With Duplicates", value: "6,914", color: "red" },
            ].map((s) => (
              <div key={s.label} className="bg-zinc-900 rounded-xl border border-zinc-800 p-3 sm:p-4 text-center">
                <div className={`text-lg sm:text-2xl font-bold text-${s.color}-400`}>{s.value}</div>
                <div className="text-xs sm:text-sm text-zinc-500">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Color Legend */}
        <section>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Map Color Legend</h2>
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 sm:p-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {[
                { color: "#3b82f6", label: "Standard facility", desc: "No duplicates detected" },
                { color: "#f59e0b", label: "Address duplicate", desc: "Shares address with others" },
                { color: "#a855f7", label: "Phone duplicate", desc: "Shares phone number" },
                { color: "#06b6d4", label: "Owner duplicate", desc: "Same business owner" },
                { color: "#ec4899", label: "Admin duplicate", desc: "Same administrator" },
                { color: "#ef4444", label: "Multiple types", desc: "2+ duplicate types" },
              ].map((c) => (
                <div key={c.label} className="flex items-center gap-2 sm:gap-3">
                  <div
                    className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-white shadow flex-shrink-0"
                    style={{ backgroundColor: c.color }}
                  />
                  <div>
                    <div className="text-xs sm:text-sm font-medium text-white">{c.label}</div>
                    <div className="text-[10px] sm:text-xs text-zinc-500">{c.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Navigation */}
        <section className="border-t border-zinc-800 pt-6 sm:pt-8">
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <Link
              href="/"
              className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm sm:text-base flex-1 sm:flex-initial text-center"
            >
              Map View
            </Link>
            <Link
              href="/explorer"
              className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-sm sm:text-base flex-1 sm:flex-initial text-center"
            >
              Explorer
            </Link>
            <Link
              href="/stacked"
              className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-sm sm:text-base flex-1 sm:flex-initial text-center"
            >
              Dashboard
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 mt-8 sm:mt-12 py-4 sm:py-6">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 text-center text-xs sm:text-sm text-zinc-500">
          Hippocratic — California Healthcare Fraud Detection Platform
        </div>
      </footer>
    </div>
  );
}
