"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export function CreatePost({ onPostCreated }: { onPostCreated: () => void }) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const supabase = createClient();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handlePost = async () => {
    if (!user || (!text.trim() && !image)) return;
    setPosting(true);
    let imageUrl: string | null = null;

    if (image) {
      const path = `${user.id}_${Date.now()}_${image.name}`;
      const { error: uploadError } = await supabase.storage
        .from("community-posts")
        .upload(path, image);
      if (uploadError) {
        toast.error(`Upload failed: ${uploadError.message}`);
        setPosting(false);
        return;
      }
      const { data: urlData } = supabase.storage
        .from("community-posts")
        .getPublicUrl(path);
      imageUrl = urlData?.publicUrl || null;
    }

    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      text: text.trim(),
      image_url: imageUrl,
    });
    setPosting(false);
    if (error) { toast.error(`Post failed: ${error.message}`); return; }
    toast.success("Post created!");
    setText("");
    setImage(null);
    setImagePreview(null);
    onPostCreated();
  };

  return (
    <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
      <Textarea
        placeholder="What's on your mind?"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="resize-none"
      />
      {imagePreview && (
        <div className="relative w-full h-48 rounded-lg overflow-hidden border border-border/50">
          <Image src={imagePreview} alt="" fill className="object-cover" unoptimized />
          <button
            onClick={() => { setImage(null); setImagePreview(null); }}
            className="absolute top-2 right-2 p-1 rounded-full bg-black/50 hover:bg-black/70 text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <label className="cursor-pointer">
          <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ImagePlus className="h-4 w-4" />
            Photo
          </div>
        </label>
        <Button onClick={handlePost} disabled={posting || !user || (!text.trim() && !image)} size="sm">
          {posting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          Post
        </Button>
      </div>
    </div>
  );
}
