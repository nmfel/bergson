import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-text-primary overflow-y-auto p-8">
      <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
        <Link to="/app" className="inline-flex items-center text-text-muted hover:text-accent transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
        </Link>
        
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-accent/10 flex items-center justify-center rounded-xl">
              <Shield className="w-6 h-6 text-accent" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
          </div>
          <p className="text-text-secondary text-lg">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        <div className="prose prose-invert prose-p:text-text-secondary prose-headings:text-text-primary max-w-none">
          <h2>1. Privacy First Architecture</h2>
          <p>
            Bergson is designed with a "Local First" philosophy. All your notes, whiteboards, and data are stored entirely on your device using IndexedDB (local storage). We do not own, operate, or maintain central servers to store your personal data.
          </p>

          <h2>2. Data Collection and Usage</h2>
          <p>
            As a local-first application, Bergson itself does not collect, transmit, or share any of your personal notes, metadata, or behavioral data with our servers.
          </p>
          <p>
            If you choose to use the Google Drive Sync feature, Bergson requests restricted access solely for the purpose of creating a dedicated backup folder in your Google Drive and managing backup files within that specific folder. We do not access, read, or modify any other files in your Google Drive.
          </p>

          <h2>3. Third-Party Services (Google OAuth)</h2>
          <p>
            Bergson uses Google OAuth to authenticate you for the Drive Sync feature. We only request the minimum permissions (`drive.file`) necessary to perform backups. 
          </p>
          <p>
            Bergson's use and transfer to any other app of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy#additional_requirements_for_specific_api_scopes" target="_blank" rel="noreferrer" className="text-accent hover:underline">Google API Services User Data Policy</a>, including the Limited Use requirements.
          </p>

          <h2>4. Data Retention and Deletion</h2>
          <p>
            Because your data lives on your device, you have full control over it. You can delete your data at any time by clearing your browser's site data or using the app's internal deletion tools. If you use Google Drive Sync, you can manage and delete your backup files directly from your Google Drive.
          </p>

          <h2>5. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy or how your data is handled, please reach out to the developer directly.
          </p>
        </div>
      </div>
    </div>
  );
};
