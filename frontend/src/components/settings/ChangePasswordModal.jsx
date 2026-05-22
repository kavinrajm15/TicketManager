import { useState } from "react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { userAPI } from "../../services/api";
import toast from "react-hot-toast";

function PasswordInput({ id, label, value, onChange, placeholder, required, children }) {
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold text-textMuted uppercase tracking-wide">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          className="block w-full px-3 py-2.5 pr-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted hover:text-textMain focus:outline-none"
        >
          {show ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>
      {children}
    </div>
  );
}

function PasswordRequirements({ password }) {
  const requirements = [
    { label: "Min 8 characters", test: (v) => v.length >= 8 },
    { label: "1 Capital letter", test: (v) => /[A-Z]/.test(v) },
    { label: "1 Number", test: (v) => /[0-9]/.test(v) },
    { label: "1 Special char", test: (v) => /[^A-Za-z0-9]/.test(v) },
  ];

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
      {requirements.map((req, idx) => {
        const isMet = req.test(password);
        return (
          <div key={idx} className="flex items-center gap-1.5">
            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${isMet ? 'bg-success/10 text-success' : 'bg-gray-200 text-gray-400'}`}>
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className={`text-[10px] font-medium ${isMet ? 'text-success' : 'text-textMuted'}`}>
              {req.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function ChangePasswordModal({ isOpen, onClose }) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const validatePassword = (pass) => {
    return (
      pass.length >= 8 &&
      /[A-Z]/.test(pass) &&
      /[0-9]/.test(pass) &&
      /[^A-Za-z0-9]/.test(pass)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validatePassword(newPassword)) {
      toast.error("Password does not meet all requirements");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await userAPI.changePassword({ oldPassword, newPassword });
      toast.success("Password changed successfully");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Change Password"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        <PasswordInput
          id="old-password"
          label="Old Password"
          value={oldPassword}
          onChange={setOldPassword}
          placeholder="Enter current password"
          required
        />
        <PasswordInput
          id="new-password"
          label="New Password"
          value={newPassword}
          onChange={setNewPassword}
          placeholder="Enter new password"
          required
        >
          <PasswordRequirements password={newPassword} />
        </PasswordInput>
        <PasswordInput
          id="confirm-password"
          label="Confirm New Password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Re-enter new password"
          required
        />
        <div className="pt-2">
          <Button type="submit" loading={loading} className="w-full">
            Update Password
          </Button>
        </div>
      </form>
    </Modal>
  );
}
