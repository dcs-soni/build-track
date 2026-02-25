export function LoadingSpinner() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#0A0A0A]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#A68B5B] border-t-transparent" />
    </div>
  );
}
