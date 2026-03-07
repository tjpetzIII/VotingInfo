"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dynamic from "next/dynamic";

const PollingMap = dynamic(() => import("@/components/PollingMap"), {
  ssr: false,
  loading: () => <div className="h-80 bg-gray-200 rounded-2xl animate-pulse" />,
});
import PollingLocationCard from "@/components/PollingLocationCard";

const schema = z.object({
  street: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z
    .string()
    .length(2, "State must be 2 letters")
    .regex(/^[a-zA-Z]+$/, "State must be letters only"),
  zip: z.string().regex(/^\d{5}$/, "ZIP must be 5 digits"),
});

type FormData = z.infer<typeof schema>;

interface PollingLocation {
  name: string | null;
  address: string | null;
  hours: string | null;
  location_name: string | null;
}

interface VoterInfoResponse {
  election: { id: string; name: string; election_day: string };
  polling_locations: PollingLocation[];
  contests: unknown[];
}

type PageState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: VoterInfoResponse }
  | { status: "error"; message: string };

export default function PollingPage() {
  const [pageState, setPageState] = useState<PageState>({ status: "idle" });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setPageState({ status: "loading" });
    const address = `${data.street}, ${data.city}, ${data.state.toUpperCase()} ${data.zip}`;
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

    try {
      const res = await fetch(
        `${apiBase}/api/voter-info?address=${encodeURIComponent(address)}`
      );

      if (res.status === 404) {
        setPageState({
          status: "error",
          message: "No election data found for this address.",
        });
        return;
      }

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setPageState({
          status: "error",
          message: (json as { error?: string }).error ?? "Failed to fetch voter info.",
        });
        return;
      }

      const result: VoterInfoResponse = await res.json();
      setPageState({ status: "success", data: result });
    } catch {
      setPageState({
        status: "error",
        message: "Could not reach the server. Please try again.",
      });
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Find Your Polling Place
      </h1>
      <p className="text-gray-500 mb-8 text-sm">
        Enter your full address to find your polling location.
      </p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white rounded-2xl shadow-md p-6 mb-8"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Street Address
            </label>
            <input
              {...register("street")}
              placeholder="e.g. 123 Main St"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.street && (
              <p className="mt-1 text-xs text-red-600">{errors.street.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              {...register("city")}
              placeholder="e.g. Austin"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.city && (
              <p className="mt-1 text-xs text-red-600">{errors.city.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                {...register("state")}
                placeholder="TX"
                maxLength={2}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase().slice(0, 2);
                  setValue("state", val, { shouldValidate: true });
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
              />
              {errors.state && (
                <p className="mt-1 text-xs text-red-600">{errors.state.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ZIP Code
              </label>
              <input
                {...register("zip")}
                placeholder="78701"
                maxLength={5}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.zip && (
                <p className="mt-1 text-xs text-red-600">{errors.zip.message}</p>
              )}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={pageState.status === "loading"}
          className="mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
        >
          {pageState.status === "loading" ? "Searching..." : "Find My Polling Place"}
        </button>
      </form>

      {pageState.status === "loading" && <LoadingSkeleton />}

      {pageState.status === "error" && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {pageState.message}
        </div>
      )}

      {pageState.status === "success" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-md p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Election
            </p>
            <p className="font-semibold text-gray-900">
              {pageState.data.election.name}
            </p>
            <p className="text-sm text-gray-500">
              {pageState.data.election.election_day}
            </p>
          </div>

          {pageState.data.polling_locations.length === 0 ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl text-sm">
              No polling locations found for this address.
            </div>
          ) : (
            <>
              <PollingMap locations={pageState.data.polling_locations} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pageState.data.polling_locations.map((loc, i) => (
                  <PollingLocationCard key={i} location={loc} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded-xl w-48" />
      <div className="h-80 bg-gray-200 rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-gray-200 rounded-2xl h-36" />
        ))}
      </div>
    </div>
  );
}
