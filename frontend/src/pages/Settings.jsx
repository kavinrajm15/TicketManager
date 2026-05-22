import { useState } from "react";
import useAuthStore from "../store/useAuthStore";
import { userAPI } from "../services/api";
import Avatar from "../components/ui/Avatar";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ChangePasswordModal from "../components/settings/ChangePasswordModal";
import PhotoEditorModal from "../components/settings/PhotoEditorModal";
import { RoleBadge } from "../components/ui/Badge";
import toast from "react-hot-toast";

function Toggle({ id, checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between py-4">
      <div>
        <p className="text-sm font-semibold text-textMain">{label}</p>
        {description && (
          <p className="text-xs text-textMuted mt-0.5">{description}</p>
        )}
      </div>
      <button
        id={id}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 ${
          checked ? "bg-primary" : "bg-gray-200"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export default function Settings() {
  const { user, updateUser } = useAuthStore();

  const [profile, setProfile] = useState({
    name: user?.name || "",
  });
  const [prefs, setPrefs] = useState({
    mutedPersonalChat: user?.notificationPrefs?.mutedPersonalChat || false,
    mutedTeamChat: user?.notificationPrefs?.mutedTeamChat || false,
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const isProfileChanged = profile.name !== user?.name;
  const isPrefsChanged = 
    prefs.mutedPersonalChat !== (user?.notificationPrefs?.mutedPersonalChat || false) ||
    prefs.mutedTeamChat !== (user?.notificationPrefs?.mutedTeamChat || false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profile.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSavingProfile(true);
    try {
      const { data } = await userAPI.updateProfile({
        name: profile.name,
      });
      updateUser(data.user);
      toast.success("Profile updated!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePrefs = async () => {
    setSavingPrefs(true);
    try {
      const { data } = await userAPI.updateNotifications(prefs);
      updateUser(data.user);
      toast.success("Notification preferences saved!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save preferences");
    } finally {
      setSavingPrefs(false);
    }
  };

  const setPref = (key, val) => setPrefs((p) => ({ ...p, [key]: val }));

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Profile section */}
      <Card className="p-6">
        <h2 className="text-base font-bold text-textMain mb-1">Profile</h2>
        <p className="text-xs text-textMuted mb-6">
          Update your personal information
        </p>

        {/* Avatar preview & Upload */}
        <div className="flex items-center gap-6 mb-8 p-6 bg-gray-50/50 rounded-2xl border border-gray-100">
          <div 
            className="relative group cursor-pointer"
            onClick={() => setIsPhotoModalOpen(true)}
          >
            <Avatar
              user={{ ...user, name: profile.name || user?.name }}
              size="2xl"
              className="ring-4 ring-white shadow-md transition-transform group-hover:scale-105"
            />
            
            {/* Hover Overlay */}
            <div 
              className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center cursor-pointer backdrop-blur-[1px]"
            >
              <svg className="w-5 h-5 text-white mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15a2.25 2.25 0 002.25-2.25V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
              <span className="text-[9px] font-bold text-white uppercase tracking-wider text-center px-2 leading-tight">
                Change<br/>Photo
              </span>
            </div>
          </div>

          <div>
            <p className="text-lg font-bold text-textMain leading-none mb-1">
              {profile.name || user?.name}
            </p>
            <p className="text-sm text-textMuted mb-3">{user?.email}</p>
            <div className="flex">
              <RoleBadge role={user?.role} />
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label
              htmlFor="settings-name"
              className="block text-xs font-semibold text-textMuted uppercase tracking-wide mb-1"
            >
              Full Name
            </label>
            <input
              id="settings-name"
              type="text"
              className="block w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={profile.name}
              onChange={(e) =>
                setProfile((p) => ({ ...p, name: e.target.value }))
              }
              required
            />
          </div>

          <div>
            <label
              htmlFor="settings-email"
              className="block text-xs font-semibold text-textMuted uppercase tracking-wide mb-1"
            >
              Email{" "}
              <span className="text-textMuted font-normal">(read-only)</span>
            </label>
            <input
              id="settings-email"
              type="email"
              className="block w-full px-3 py-2.5 text-sm border border-gray-100 rounded-lg bg-gray-50 text-textMuted cursor-not-allowed"
              value={user?.email || ""}
              readOnly
            />
          </div>

          <div>
            <label
              htmlFor="settings-role"
              className="block text-xs font-semibold text-textMuted uppercase tracking-wide mb-1"
            >
              Role{" "}
              <span className="text-textMuted font-normal">(read-only)</span>
            </label>
            <input
              id="settings-role"
              type="text"
              className="block w-full px-3 py-2.5 text-sm border border-gray-100 rounded-lg bg-gray-50 text-textMuted cursor-not-allowed capitalize"
              value={user?.role || ""}
              readOnly
            />
          </div>



          <div className="pt-2">
            <Button 
              id="save-profile-btn" 
              type="submit" 
              loading={savingProfile}
              disabled={!isProfileChanged}
            >
              Save Profile
            </Button>
          </div>
        </form>
      </Card>

      {/* Notification preferences */}
      <Card className="p-6">
        <h2 className="text-base font-bold text-textMain mb-1">
          Notification Preferences
        </h2>
        <p className="text-xs text-textMuted mb-4">
          Control which notifications you receive
        </p>

        <div className="divide-y divide-gray-50">
          <Toggle
            id="toggle-personal-chat"
            label="Mute Personal Chat"
            description="Stop receiving notifications for direct messages"
            checked={prefs.mutedPersonalChat}
            onChange={(v) => setPref("mutedPersonalChat", v)}
          />
          <Toggle
            id="toggle-team-chat"
            label="Mute Team Chat"
            description="Stop receiving notifications for group project chats"
            checked={prefs.mutedTeamChat}
            onChange={(v) => setPref("mutedTeamChat", v)}
          />
        </div>

        <div className="pt-4">
          <Button
            id="save-notifications-btn"
            onClick={handleSavePrefs}
            loading={savingPrefs}
            disabled={!isPrefsChanged}
          >
            Save Preferences
          </Button>
        </div>
      </Card>

      {/* Password section */}
      <Card className="p-6">
        <h2 className="text-base font-bold text-textMain mb-1">Security</h2>
        <p className="text-xs text-textMuted mb-4">
          Manage your account security and password
        </p>
        <Button 
          id="change-password-btn" 
          variant="secondary" 
          size="sm"
          onClick={() => setIsPasswordModalOpen(true)}
        >
          Change Password
        </Button>
      </Card>

      <ChangePasswordModal 
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
      <PhotoEditorModal 
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
      />
    </div>
  );
}
