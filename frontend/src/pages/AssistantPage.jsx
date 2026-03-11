import React from "react";
import TopNav from "../components/ui/TopNav";
import DogEyesCoverBlink from "../components/dog-eye-tracker";
import AssistantChatPanel from "../components/AssistantChatPanel";

export default function AssistantPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <TopNav />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="grid md:grid-cols-[auto_1fr] gap-6 items-center">
            <div className="sm:mx-auto hidden md:block mx-0">
              <DogEyesCoverBlink size={180} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Casper Assistant
              </h1>
              <p className="text-slate-600 mt-2">
                Ask about dog care, breed behavior, disease-result education, or how to use DogScan AI features.
              </p>
            </div>
          </div>
        </section>

        <AssistantChatPanel
          mode="general"
          title="General Assistant Chat"
        />
      </div>
    </div>
  );
}
