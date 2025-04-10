import React, { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button"; // Optional: for styling
import MainLayout from '@/components/layout/MainLayout'; // Assuming you want layout

function StorageTest() {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleTestUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage('Starting upload...');
    setIsLoading(true);

    if (!e.target.files || e.target.files.length === 0) {
      setMessage('No file selected.');
      setIsLoading(false);
      return;
    }
    if (!user) {
      setMessage('User not logged in.');
      setIsLoading(false);
      return;
    }

    const file = e.target.files[0];
    // Use a simpler path for testing, directly under user ID
    const testPath = `${user.id}/${file.name}`;
    console.log(`[StorageTest] Attempting upload for user ${user.id} to path: ${testPath}`);

    try {
      const { data: uploadData, error } = await supabase.storage
        .from('candidateartifacts')
        .upload(testPath, file, {
            cacheControl: '3600',
            upsert: true
        });

      console.log("[StorageTest] Upload response:", { uploadData, error });

      if (error) {
        setMessage(`Upload failed: ${error.message}`);
        console.error("Test Upload Error:", error);
      } else {
        setMessage(`Upload successful! Path: ${testPath}`);
        const { data: urlData } = supabase.storage.from('candidateartifacts').getPublicUrl(testPath);
        console.log("[StorageTest] Public URL:", urlData?.publicUrl);
        setMessage(prev => `${prev} | URL: ${urlData?.publicUrl}`);
      }
    } catch (err: any) {
      setMessage(`Caught exception: ${err.message}`);
      console.error("Test Upload Exception:", err);
    } finally {
      setIsLoading(false);
      // Reset file input
      e.target.value = "";
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-8 space-y-4">
        <h1 className="text-2xl font-bold">Storage Upload Test</h1>
        <p>Test uploading directly to the bucket root under user ID.</p>
        <input
          type="file"
          onChange={handleTestUpload}
          disabled={isLoading}
          accept="application/pdf,video/*" // Allow PDF and video
        />
        {isLoading && <p>Uploading...</p>}
        {message && <p className={`mt-4 p-2 ${message.startsWith('Upload failed') || message.startsWith('Caught exception') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{message}</p>}
      </div>
    </MainLayout>
  );
}

export default StorageTest;
