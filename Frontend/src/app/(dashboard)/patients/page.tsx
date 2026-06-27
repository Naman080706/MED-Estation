"use client";

import React, { useEffect, useMemo, useState } from "react";
import { UserCircle2, ShieldCheck, Phone, MapPin, Plus, Search } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  birthdate: string;
  address: string;
  phone?: string | null;
  gender: string;
  insurance?: string | null;
}

interface PatientStats {
  total_patients: number;
  insured_patients: number;
  uninsured_patients: number;
}

interface InsuranceProvider {
  id: number;
  name: string;
  phone: string;
  co_pay: string;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState<PatientStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [insuranceList, setInsuranceList] = useState<InsuranceProvider[]>([]);
  const [insuranceSearch, setInsuranceSearch] = useState("");
  const [selectedInsuranceId, setSelectedInsuranceId] = useState<number | null>(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    birthdate: "",
    address: "",
    phone: "",
    gender: "Other",
    insurance: "",
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [list, s, ins] = await Promise.all([
          apiFetch<Patient[]>("/patients/"),
          apiFetch<PatientStats>("/patients/stats"),
          apiFetch<InsuranceProvider[]>("/insurance/").catch(() => []),
        ]);
        setPatients(list);
        setStats(s);
        setInsuranceList(Array.isArray(ins) ? ins : []);
      } catch (err) {
        console.error("Failed to load patients", err);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return patients;
    return patients.filter((p) => {
      const full = `${p.first_name} ${p.last_name}`.toLowerCase();
      return (
        full.includes(term) ||
        (p.phone || "").toLowerCase().includes(term) ||
        (p.insurance || "").toLowerCase().includes(term)
      );
    });
  }, [patients, search]);

  const displayed = useMemo(() => {
    // By default, only show top 5 to keep the card compact.
    // When searching, show all matching patients.
    if (!search.trim()) {
      return filtered.slice(0, 5);
    }
    return filtered;
  }, [filtered, search]);

  const filteredInsurance = useMemo(() => {
    const term = insuranceSearch.trim().toLowerCase();
    if (!term) return insuranceList;
    return insuranceList.filter(
      (i) =>
        i.name.toLowerCase().includes(term) ||
        (i.phone || "").toLowerCase().includes(term)
    );
  }, [insuranceList, insuranceSearch]);

  const topInsurance = useMemo(
    () => filteredInsurance.slice(0, 3),
    [filteredInsurance]
  );

  const selectedInsurance =
    selectedInsuranceId != null
      ? insuranceList.find((i) => i.id === selectedInsuranceId) || null
      : topInsurance[0] || null;

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name?.trim() || !form.last_name?.trim() || !form.birthdate || !form.address?.trim()) {
      setCreateError("First name, last name, birthdate, and address are required.");
      return;
    }
    setCreateError(null);
    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        birthdate: form.birthdate,
        address: form.address.trim(),
        phone: form.phone?.trim() || null,
        gender: form.gender || "Other",
        insurance: form.insurance?.trim() || null,
      };
      await apiFetch<Patient>("/patients/", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setShowForm(false);
      setForm({
        first_name: "",
        last_name: "",
        birthdate: "",
        address: "",
        phone: "",
        gender: "Other",
        insurance: "",
      });
      setCreateSuccess(true);
      setTimeout(() => setCreateSuccess(false), 4000);
      const [list, s] = await Promise.all([
        apiFetch<Patient[]>("/patients/"),
        apiFetch<PatientStats>("/patients/stats"),
      ]);
      setPatients(list);
      setStats(s);
    } catch (err) {
      console.error("Failed to create patient", err);
      setCreateError(err instanceof Error ? err.message : "Failed to add patient to database.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-in fade-in duration-400">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1E293B] dark:text-[#F9FAFB]">
            Patients & Insurance
          </h1>
          <p className="text-sm text-[#64748B] dark:text-[#9CA3AF] mt-0.5">
            Central registry of patients, contact details, and insurance coverage.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm((open) => !open);
            setCreateError(null);
          }}
          className="flex items-center gap-2 rounded-xl bg-[#2BB673] px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-[#2BB673]/20 hover:bg-[#22996A] transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Patient
        </button>
      </div>

      {createSuccess && (
        <div className="rounded-xl border border-[#2BB673]/40 bg-[#EAF7F1] dark:bg-[#134E4A]/30 px-4 py-2.5 text-sm text-[#166534] dark:text-[#6EE7B7]">
          Patient added to database. List updated.
        </div>
      )}
      {createError && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 px-4 py-2.5 text-sm text-red-700 dark:text-red-300">
          {createError}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl p-4 border border-[#EEF2F6] dark:border-[#1F2933] bg-white dark:bg-[#020617] flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#EAF7F1] dark:bg-[#134E4A] flex items-center justify-center">
              <UserCircle2 className="h-4 w-4 text-[#2BB673]" />
            </div>
            <div>
              <p className="text-[11px] text-[#64748B] dark:text-[#9CA3AF]">Total Patients</p>
              <p className="text-lg font-bold text-[#1E293B] dark:text-[#F9FAFB]">
                {stats.total_patients}
              </p>
            </div>
          </div>
          <div className="rounded-2xl p-4 border border-[#EEF2F6] dark:border-[#1F2933] bg-white dark:bg-[#020617] flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#EAF7F1] dark:bg-[#134E4A] flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-[#2BB673]" />
            </div>
            <div>
              <p className="text-[11px] text-[#64748B] dark:text-[#9CA3AF]">Insured Patients</p>
              <p className="text-lg font-bold text-[#1E293B] dark:text-[#F9FAFB]">
                {stats.insured_patients}
              </p>
            </div>
          </div>
          <div className="rounded-2xl p-4 border border-[#EEF2F6] dark:border-[#1F2933] bg-white dark:bg-[#020617] flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#F97316]/10 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-[#F97316]" />
            </div>
            <div>
              <p className="text-[11px] text-[#64748B] dark:text-[#9CA3AF]">Uninsured Patients</p>
              <p className="text-lg font-bold text-[#1E293B] dark:text-[#F9FAFB]">
                {stats.uninsured_patients}
              </p>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white dark:bg-[#020617] rounded-2xl p-5 border border-[#EEF2F6] dark:border-[#1F2933] shadow-[0px_10px_30px_rgba(16,24,40,0.05)] space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#64748B] dark:text-[#9CA3AF] mb-1">
                First Name
              </label>
              <input
                name="first_name"
                value={form.first_name}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-[#E5E7EB] dark:border-[#1F2933] bg-[#F9FAFB] dark:bg-[#020617] px-3 py-2 text-xs text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#2BB673]/40"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#64748B] dark:text-[#9CA3AF] mb-1">
                Last Name
              </label>
              <input
                name="last_name"
                value={form.last_name}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-[#E5E7EB] dark:border-[#1F2933] bg-[#F9FAFB] dark:bg-[#020617] px-3 py-2 text-xs text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#2BB673]/40"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#64748B] dark:text-[#9CA3AF] mb-1">
                Birthdate
              </label>
              <input
                type="date"
                name="birthdate"
                value={form.birthdate}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-[#E5E7EB] dark:border-[#1F2933] bg-[#F9FAFB] dark:bg-[#020617] px-3 py-2 text-xs text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#2BB673]/40"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#64748B] dark:text-[#9CA3AF] mb-1">
                Gender
              </label>
              <select
                name="gender"
                value={form.gender}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-[#E5E7EB] dark:border-[#1F2933] bg-[#F9FAFB] dark:bg-[#020617] px-3 py-2 text-xs text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#2BB673]/40"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#64748B] dark:text-[#9CA3AF] mb-1">
                Phone (optional)
              </label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-[#E5E7EB] dark:border-[#1F2933] bg-[#F9FAFB] dark:bg-[#020617] px-3 py-2 text-xs text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#2BB673]/40"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#64748B] dark:text-[#9CA3AF] mb-1">
                Insurance Provider (optional)
              </label>
              <input
                name="insurance"
                value={form.insurance}
                onChange={handleFormChange}
                className="w-full rounded-xl border border-[#E5E7EB] dark:border-[#1F2933] bg-[#F9FAFB] dark:bg-[#020617] px-3 py-2 text-xs text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#2BB673]/40"
                placeholder="e.g. HDFC Ergo, Star Health"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#64748B] dark:text-[#9CA3AF] mb-1">
              Address
            </label>
            <input
              name="address"
              value={form.address}
              onChange={handleFormChange}
              className="w-full rounded-xl border border-[#E5E7EB] dark:border-[#1F2933] bg-[#F9FAFB] dark:bg-[#020617] px-3 py-2 text-xs text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#2BB673]/40"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-xs font-medium rounded-xl border border-[#E5E7EB] dark:border-[#1F2933] text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#111827]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-[#2BB673] text-white hover:bg-[#22996A]"
            >
              Save Patient
            </button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-[#020617] rounded-2xl border border-[#EEF2F6] dark:border-[#1F2933] shadow-[0px_10px_30px_rgba(16,24,40,0.05)] overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-[#EEF2F6] dark:border-[#1F2933]">
          <h2 className="text-sm font-semibold text-[#1E293B] dark:text-[#F9FAFB] flex items-center gap-2">
            <UserCircle2 className="h-4 w-4 text-[#64748B] dark:text-[#9CA3AF]" /> Patient Registry
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, insurance…"
              className="w-full sm:w-56 rounded-full border border-[#E5E7EB] dark:border-[#1F2933] bg-[#F9FAFB] dark:bg-[#020617] px-3 py-1.5 text-[11px] text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#2BB673]/30"
            />
            <p className="text-[11px] text-[#94A3B8] dark:text-[#9CA3AF] text-right sm:text-left">
              {displayed.length} of {patients.length} patients shown{" "}
              {!search.trim() ? "(top 5)" : "(filtered)"}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#F9FAFB] dark:bg-[#020617] text-[#6B7280] dark:text-[#9CA3AF]">
              <tr>
                <th className="text-left font-medium px-4 py-2">Name</th>
                <th className="text-left font-medium px-4 py-2">Contact</th>
                <th className="text-left font-medium px-4 py-2">Insurance</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-[#94A3B8]">
                    Loading patients from database…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-[#94A3B8]">
                    No patients found for this filter.
                  </td>
                </tr>
              ) : (
                displayed.map((p) => (
                  <tr key={p.id} className="border-b border-[#F1F5F9] dark:border-[#111827] last:border-0">
                    <td className="px-4 py-3 align-top">
                      <p className="font-semibold text-[#1E293B] dark:text-[#F9FAFB]">
                        {p.first_name} {p.last_name}
                      </p>
                      <p className="text-[11px] text-[#64748B] dark:text-[#9CA3AF]">
                        DOB: {new Date(p.birthdate).toLocaleDateString("en-IN")}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="flex items-center gap-1 text-[11px] text-[#64748B] dark:text-[#9CA3AF]">
                        <Phone className="h-3 w-3" /> {p.phone || "—"}
                      </p>
                      <p className="flex items-center gap-1 text-[11px] text-[#64748B] dark:text-[#9CA3AF]">
                        <MapPin className="h-3 w-3" /> {p.address}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {p.insurance ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#EAF7F1] dark:bg-[#134E4A] text-[11px] font-semibold text-[#2BB673] dark:text-[#6EE7B7]">
                          <ShieldCheck className="h-3 w-3" /> {p.insurance}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-[11px] font-semibold text-red-600">
                          <ShieldCheck className="h-3 w-3" /> No insurance
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insurance information - same layout as Supplier Directory */}
      <div className="bg-white dark:bg-[#020617] rounded-2xl p-6 border border-[#EEF2F6] dark:border-[#1F2933] shadow-[0px_10px_30px_rgba(16,24,40,0.05)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[#1E293B] dark:text-[#F9FAFB] flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#64748B] dark:text-[#9CA3AF]" /> Insurance information
            </h2>
            <p className="text-[11px] text-[#64748B] dark:text-[#9CA3AF] mt-0.5">
              Search providers from the database or tap one to see details.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-[#F9FAFB] dark:bg-[#020617] border border-[#E5E7EB] dark:border-[#1F2933] px-3 py-1.5 w-full max-w-xs">
            <Search className="h-3.5 w-3.5 text-[#94A3B8] dark:text-[#9CA3AF]" />
            <input
              type="text"
              value={insuranceSearch}
              onChange={(e) => setInsuranceSearch(e.target.value)}
              placeholder="Search by name or phone…"
              className="bg-transparent text-xs outline-none w-full text-[#111827] dark:text-[#F9FAFB] placeholder:text-[#D1D5DB]"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            {topInsurance.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => setSelectedInsuranceId(i.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs transition-colors dark:border-[#1F2933] ${
                  selectedInsurance && selectedInsurance.id === i.id
                    ? "border-[#2BB673] bg-[#EAF7F1] dark:bg-[#134E4A]/30"
                    : "border-[#EEF2F6] dark:border-[#1F2933] hover:border-[#2BB673]/40 hover:bg-[#F6F8FA] dark:hover:bg-[#111827]"
                }`}
              >
                <p className="font-semibold text-[#1E293B] dark:text-[#F9FAFB]">{i.name}</p>
                <p className="text-[11px] text-[#64748B] dark:text-[#9CA3AF]">
                  Co-pay: {i.co_pay || "—"}
                </p>
              </button>
            ))}
            {!topInsurance.length && (
              <p className="text-[11px] text-[#94A3B8] dark:text-[#9CA3AF]">
                No insurance providers in the database yet.
              </p>
            )}
          </div>
          <div className="md:col-span-2">
            {selectedInsurance ? (
              <div className="rounded-xl border border-[#EEF2F6] dark:border-[#1F2933] bg-[#F9FAFB] dark:bg-[#020617] px-4 py-3 text-xs space-y-1.5">
                <p className="text-[11px] font-semibold text-[#94A3B8] dark:text-[#9CA3AF] uppercase tracking-wider">
                  Provider details
                </p>
                <p className="text-sm font-bold text-[#1E293B] dark:text-[#F9FAFB]">
                  {selectedInsurance.name}
                </p>
                <p className="text-[11px] text-[#64748B] dark:text-[#9CA3AF] flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {selectedInsurance.phone || "—"}
                </p>
                <p className="text-[11px] text-[#64748B] dark:text-[#9CA3AF]">
                  Co-pay: <span className="font-semibold text-[#2BB673]">{selectedInsurance.co_pay || "—"}</span>
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-[#94A3B8] dark:text-[#9CA3AF]">
                Select a provider on the left to view details.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

