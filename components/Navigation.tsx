'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Home, Settings, LogOut, FolderOpen, Menu, X } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useAuthActions } from '@/hooks/useAuthActions';

interface NavigationProps {
    showFullNav?: boolean;
}

export default function Navigation({ showFullNav = true }: NavigationProps) {
    const { user, isLoading, isInitialized } = useAuthStore();
    const { signOut } = useAuthActions();
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const router = useRouter();

    const isAuthenticated = !!user;

    // Debug logging
    useEffect(() => {
        console.log('Navigation: Auth state -', {
            hasUser: !!user,
            userEmail: user?.email,
            isLoading,
            isInitialized,
            isAuthenticated
        });
    }, [user, isLoading, isInitialized, isAuthenticated]);

    useEffect(() => {
        const getUserRole = async () => {
            if (user?.id) {
                try {
                    // Get user role from the admin API
                    const roleResponse = await fetch('/api/admin', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'getUserRole', userId: user.id }),
                    });

                    if (roleResponse.ok) {
                        const roleData = await roleResponse.json();
                        setUserRole(roleData.role);
                    } else {
                        setUserRole(null);
                    }
                } catch (error) {
                    console.error('Error fetching user role:', error);
                    setUserRole(null);
                }
            } else {
                setUserRole(null);
            }
        };

        getUserRole();
    }, [user?.id]);

    const handleSignOut = async () => {
        try {
            setUserRole(null); // Clear role immediately for UI feedback
            setIsMobileMenuOpen(false); // Close mobile menu
            await signOut();
        } catch (error) {
            console.error('Sign out error:', error);
            // Force navigation to login even if there's an error
            router.push('/login');
        }
    };

    const handleNavigation = (path: string) => {
        setIsMobileMenuOpen(false); // Close mobile menu on navigation
        router.push(path);
    };

    if (!showFullNav) {
        return null;
    }

    return (
        <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="max-w-6xl mx-auto px-4 py-3">
                {/* Desktop Navigation */}
                <div className="flex justify-between items-center">
                    {/* Logo */}
                    <Button
                        variant="ghost"
                        onClick={() => handleNavigation('/')}
                        className="text-lg font-semibold"
                    >
                        <Home className="h-4 w-4 mr-2" />
                        Archy XR
                    </Button>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-6">
                        {isAuthenticated && isInitialized && (
                            <>
                                {userRole === 'Admin' && (
                                    <Button
                                        variant="ghost"
                                        onClick={() => handleNavigation('/admin')}
                                        className="text-purple-600 hover:text-purple-700"
                                    >
                                        <Settings className="h-4 w-4 mr-2" />
                                        Admin
                                    </Button>
                                )}

                                {userRole === 'Archivist' && (
                                    <Button
                                        variant="ghost"
                                        onClick={() => handleNavigation('/archivist')}
                                        className="text-green-600 hover:text-green-700"
                                    >
                                        <Settings className="h-4 w-4 mr-2" />
                                        Dashboard
                                    </Button>
                                )}

                                {userRole === 'Admin' && (
                                    <Button
                                        variant="ghost"
                                        onClick={() => handleNavigation('/admin/users')}
                                    >
                                        <Users className="h-4 w-4 mr-2" />
                                        Users
                                    </Button>
                                )}

                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        // Route users to their role-specific sections
                                        if (userRole === 'Admin') {
                                            handleNavigation('/admin/projects');
                                        } else if (userRole === 'Archivist') {
                                            handleNavigation('/archivist/projects');
                                        } else {
                                            handleNavigation('/projects');
                                        }
                                    }}
                                >
                                    <FolderOpen className="h-4 w-4 mr-2" />
                                    {userRole === 'User' ? 'Browse Projects' :
                                        userRole === 'Archivist' ? 'My Projects' : 'Projects'}
                                </Button>

                                {userRole === 'User' && (
                                    <Button
                                        variant="ghost"
                                        onClick={() => handleNavigation('/')}
                                        className="text-green-600 hover:text-green-700"
                                    >
                                        <Home className="h-4 w-4 mr-2" />
                                        My Work
                                    </Button>
                                )}
                            </>
                        )}
                    </div>

                    {/* Desktop User Menu */}
                    <div className="hidden md:flex items-center space-x-4">
                        {!isInitialized ? (
                            <div className="h-8 w-20 bg-muted animate-pulse rounded"></div>
                        ) : isAuthenticated && user ? (
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm text-muted-foreground max-w-[150px] truncate">
                                        {user.email}
                                    </span>
                                    {userRole && (
                                        <Badge variant="secondary" className="text-xs">
                                            {userRole}
                                        </Badge>
                                    )}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleSignOut}
                                >
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Sign Out
                                </Button>
                            </div>
                        ) : (
                            <div className="flex space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleNavigation('/login')}
                                >
                                    Login
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => handleNavigation('/register')}
                                >
                                    Register
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center space-x-2">
                        {isAuthenticated && user && userRole && (
                            <Badge variant="secondary" className="text-xs">
                                {userRole}
                            </Badge>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="p-2"
                        >
                            {isMobileMenuOpen ? (
                                <X className="h-5 w-5" />
                            ) : (
                                <Menu className="h-5 w-5" />
                            )}
                        </Button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden mt-4 pb-4 border-t border-border">
                        <div className="flex flex-col space-y-2 pt-4">
                            {!isInitialized ? (
                                <div className="h-8 w-full bg-muted animate-pulse rounded"></div>
                            ) : isAuthenticated && user ? (
                                <>
                                    {/* User Info */}
                                    <div className="px-3 py-2 bg-muted/50 rounded-lg">
                                        <div className="text-sm font-medium truncate">{user.email}</div>
                                        {userRole && (
                                            <div className="text-xs text-muted-foreground">{userRole}</div>
                                        )}
                                    </div>

                                    {/* Navigation Links */}
                                    {userRole === 'Admin' && (
                                        <Button
                                            variant="ghost"
                                            onClick={() => handleNavigation('/admin')}
                                            className="justify-start text-purple-600 hover:text-purple-700"
                                        >
                                            <Settings className="h-4 w-4 mr-2" />
                                            Admin
                                        </Button>
                                    )}

                                    {userRole === 'Archivist' && (
                                        <Button
                                            variant="ghost"
                                            onClick={() => handleNavigation('/archivist')}
                                            className="justify-start text-green-600 hover:text-green-700"
                                        >
                                            <Settings className="h-4 w-4 mr-2" />
                                            Dashboard
                                        </Button>
                                    )}

                                    {userRole === 'Admin' && (
                                        <Button
                                            variant="ghost"
                                            onClick={() => handleNavigation('/admin/users')}
                                            className="justify-start"
                                        >
                                            <Users className="h-4 w-4 mr-2" />
                                            Users
                                        </Button>
                                    )}

                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            if (userRole === 'Admin') {
                                                handleNavigation('/admin/projects');
                                            } else if (userRole === 'Archivist') {
                                                handleNavigation('/archivist/projects');
                                            } else {
                                                handleNavigation('/projects');
                                            }
                                        }}
                                        className="justify-start"
                                    >
                                        <FolderOpen className="h-4 w-4 mr-2" />
                                        {userRole === 'User' ? 'Browse Projects' :
                                            userRole === 'Archivist' ? 'My Projects' : 'Projects'}
                                    </Button>

                                    {userRole === 'User' && (
                                        <Button
                                            variant="ghost"
                                            onClick={() => handleNavigation('/')}
                                            className="justify-start text-green-600 hover:text-green-700"
                                        >
                                            <Home className="h-4 w-4 mr-2" />
                                            My Work
                                        </Button>
                                    )}

                                    {/* Sign Out */}
                                    <div className="pt-2 border-t border-border">
                                        <Button
                                            variant="outline"
                                            onClick={handleSignOut}
                                            className="w-full justify-start"
                                        >
                                            <LogOut className="h-4 w-4 mr-2" />
                                            Sign Out
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Button
                                        variant="outline"
                                        onClick={() => handleNavigation('/login')}
                                        className="w-full justify-start"
                                    >
                                        Login
                                    </Button>
                                    <Button
                                        onClick={() => handleNavigation('/register')}
                                        className="w-full justify-start"
                                    >
                                        Register
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
