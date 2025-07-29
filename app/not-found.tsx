export default function NotFound() {
    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 overflow-hidden">
            <div className="text-center">
                <h1 className="text-9xl font-bold text-gray-300 mb-4">404</h1>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Page Not Found</h2>
                <p className="text-lg text-gray-600">
                    The page you're looking for doesn't exist or has been moved.
                </p>
            </div>
        </div>
    );
}