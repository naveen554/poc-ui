export function Loader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="flex flex-col items-center">
        <div className="mb-6">
          <img 
            src="/NylLogo.svg" 
            alt="NYL Logo" 
            className="h-16 w-16 animate-spin-y"
          />
        </div>
        <div className="text-center text-white text-base px-6 py-3">
          Loading...
        </div>
      </div>
    </div>
  );
}
