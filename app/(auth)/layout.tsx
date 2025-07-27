import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Authentication - Archy XR',
    description: 'Sign in to your Archy XR account',
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-[calc(100vh-4rem)] overflow-hidden flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 px-6 py-8">
            <div className="w-full max-w-md flex flex-col items-center">
                {/* Auth Header */}
                <div className="text-center mb-4 flex-shrink-0">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        <span className="text-purple-600">Archy</span> XR
                    </h1>
                </div>

                {/* Auth Content */}
                <div className="w-full">
                    {children}
                </div>

                {/* Footer */}
                <div className="text-center mt-4 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                    <p>&copy; 2025 Archy XR. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
}