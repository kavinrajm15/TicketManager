import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import getCroppedImg from "../../utils/cropImage";
import Button from "../ui/Button";
import Avatar from "../ui/Avatar";
import toast from "react-hot-toast";
import { userAPI } from "../../services/api";
import useAuthStore from "../../store/useAuthStore";

export default function PhotoEditorModal({ isOpen, onClose }) {
  const { user, updateUser } = useAuthStore();
  const [image, setImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  const onCropComplete = useCallback((_croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a valid image file (JPG, PNG, GIF)");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setImage(reader.result);
    };
  };

  const handleUpload = async () => {
    if (!croppedAreaPixels) return;
    setUploading(true);
    try {
      const croppedImageBlob = await getCroppedImg(image, croppedAreaPixels);
      const formData = new FormData();
      formData.append("photo", croppedImageBlob, "profile.jpg");

      const { data } = await userAPI.updatePhoto(formData);
      updateUser(data.user);
      toast.success("Profile picture updated!");
      handleClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const { data } = await userAPI.removePhoto();
      updateUser(data.user);
      toast.success("Profile picture removed");
      handleClose();
    } catch (err) {
      toast.error("Failed to remove photo");
    } finally {
      setRemoving(false);
    }
  };

  const handleClose = () => {
    setImage(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setUploading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-textMain">Profile Photo</h3>
          <button onClick={handleClose} className="text-textMuted hover:text-textMain">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {!image ? (
            <div className="flex flex-col items-center">
              <div className="mb-6">
                <Avatar user={user} size="2xl" className="w-32 h-32 ring-4 ring-gray-50 shadow-lg" />
              </div>
              
              <div className="flex flex-col gap-3 w-full">
                <label className="cursor-pointer">
                  <div className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md active:scale-95">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M16 8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload New Photo
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>

                {user.photo && (
                  <button 
                    onClick={handleRemove}
                    disabled={removing}
                    className="flex items-center justify-center gap-2 text-rose-500 hover:bg-rose-50 font-bold py-3 px-4 rounded-xl transition-all"
                  >
                    {removing ? (
                        <div className="w-4 h-4 border-2 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
                    ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    )}
                    Remove Current Photo
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="relative w-full aspect-square bg-gray-900 rounded-xl overflow-hidden mb-6">
                <Cropper
                  image={image}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                   <span className="text-xs font-bold text-textMuted uppercase tracking-wider">Zoom</span>
                   <span className="text-xs font-mono text-textMuted">{Math.round(zoom * 100)}%</span>
                </div>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(e.target.value)}
                  className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="secondary" 
                  className="flex-1" 
                  onClick={() => setImage(null)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={handleUpload}
                  loading={uploading}
                >
                  Apply Photo
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
