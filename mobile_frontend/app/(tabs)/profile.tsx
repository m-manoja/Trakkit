import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert, Dimensions, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/theme/colors';
import { useAuth } from '../../src/context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getProfile } from '../../src/api/users';

const { width } = Dimensions.get('window');

type IoniconName = keyof typeof Ionicons.glyphMap;

interface MenuItem {
    icon: IoniconName;
    label: string;
    subtitle: string;
    onPress: () => void;
    color: string;
    bgColor: string;
}

export default function ProfileScreen() {
    const { user, signOut } = useAuth();
    const router = useRouter();
    const [profileImage, setProfileImage] = useState<string | null>((user as any)?.profileImage || null);
    useFocusEffect(
        React.useCallback(() => {
            if (!user?.id) return;
            
            // Immediately use context image if available
            if ((user as any)?.profileImage) {
                setProfileImage((user as any).profileImage);
            }

            // Also fetch fresh from API
            getProfile(user.id, user.token)
                .then(res => {
                    if (res?.success && res?.data?.profile_picture) {
                        setProfileImage(res.data.profile_picture);
                    }
                })
                .catch(() => {});
        }, [user?.id, (user as any)?.profileImage])
    );

    const handleLogout = async () => {
        Alert.alert(
            "Sign Out",
            "Are you sure you want to sign out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Sign Out",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await signOut();
                            // AuthGuard will handle routing to login automatically
                        } catch (e) {
                            Alert.alert("Error", "Failed to sign out");
                        }
                    },
                },
            ]
        );
    };

    const handleEditProfile = () => {
        router.push("/(tabs)/profile_setup");
    };

    const initials = (user as any)?.firstName
        ? `${(user as any).firstName[0]}${(user as any)?.lastName ? (user as any).lastName[0] : ''}`.toUpperCase()
        : 'U';

    const fullName = (user as any)?.firstName
        ? `${(user as any).firstName} ${(user as any)?.lastName || ''}`.trim()
        : 'User';

    const menuItems: MenuItem[] = [
        {
            icon: 'person-outline',
            label: 'Edit Profile',
            subtitle: 'Update your personal details',
            onPress: handleEditProfile,
            color: COLORS.primary,
            bgColor: `${COLORS.primary}18`,
        },
        {
            icon: 'diamond-outline',
            label: 'Trakkit Premium',
            subtitle: 'Upgrade plan & billing',
            onPress: () => router.push('/pricing'),
            color: COLORS.primary,
            bgColor: `${COLORS.primary}18`,
        },
        {
            icon: 'help-circle-outline',
            label: 'Help & Support',
            subtitle: 'Get help or contact us',
            onPress: () => Alert.alert('Help', 'Coming soon!'),
            color: '#007AFF',
            bgColor: '#007AFF18',
        },
        {
            icon: 'settings-outline',
            label: 'Settings',
            subtitle: 'Notifications, sharing & calendar',
            onPress: () => router.push('/settings'),
            color: '#8E8E93',
            bgColor: '#8E8E9318',
        },
    ];

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

            <ScrollView showsVerticalScrollIndicator={false} bounces={true}>
                {/* Profile Header */}
                <View style={styles.headerGradient}>
                    {/* Top bar */}
                    <View style={styles.topBar}>
                        <Text style={styles.pageTitle}>My Profile</Text>
                    </View>

                    {/* Avatar */}
                    <View style={styles.avatarWrapper}>
                        <View style={styles.avatarRing}>
                            {profileImage ? (
                                <Image
                                    source={{ uri: profileImage }}
                                    style={styles.avatarImage}
                                    contentFit="cover"
                                />
                            ) : (
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>{initials}</Text>
                                </View>
                            )}
                        </View>
                        <TouchableOpacity style={styles.cameraBtn} onPress={handleEditProfile}>
                            <Ionicons name="camera" size={14} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.headerName}>{fullName}</Text>
                </View>

                {/* Info Pills */}
                <View style={styles.infoPillsContainer}>
                    <View style={styles.infoPill}>
                        <Ionicons name="call-outline" size={16} color={COLORS.primary} />
                        <Text style={styles.infoPillText}>{(user as any)?.phone || '—'}</Text>
                    </View>
                    {(user as any)?.email && (
                        <View style={styles.infoPill}>
                            <Ionicons name="mail-outline" size={16} color={COLORS.primary} />
                            <Text style={styles.infoPillText}>{(user as any).email}</Text>
                        </View>
                    )}
                </View>

                {/* Menu Section */}
                <View style={styles.menuSection}>
                    <Text style={styles.sectionHeader}>Account</Text>
                    <View style={styles.menuCard}>
                        {menuItems.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.menuItem,
                                    index < menuItems.length - 1 && styles.menuItemBorder
                                ]}
                                onPress={item.onPress}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.menuIconBox, { backgroundColor: item.bgColor }]}>
                                    <Ionicons name={item.icon} size={20} color={item.color} />
                                </View>
                                <View style={styles.menuTextBlock}>
                                    <Text style={styles.menuLabel}>{item.label}</Text>
                                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Logout */}
                <View style={styles.logoutSection}>
                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
                        <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
                        <Text style={styles.logoutText}>Sign Out</Text>
                    </TouchableOpacity>
                </View>

                {/* Version */}
                <Text style={styles.version}>Trakkit v1.0.0</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F7',
    },
    headerGradient: {
        paddingTop: 8,
        paddingBottom: 48,
        paddingHorizontal: 20,
        alignItems: 'center',
        backgroundColor: COLORS.primary,
    },
    topBar: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    pageTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: 0.3,
    },

    avatarWrapper: {
        position: 'relative',
        marginBottom: 16,
    },
    avatarRing: {
        padding: 3,
        borderRadius: 58,
        backgroundColor: 'rgba(255,255,255,0.35)',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
    },
    avatarText: {
        fontSize: 38,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 1,
    },
    avatarImage: {
        width: 86,
        height: 86,
        borderRadius: 43,
    },
    cameraBtn: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.secondary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    headerName: {
        fontSize: 22,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 4,
        letterSpacing: 0.3,
    },
    headerEmail: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        letterSpacing: 0.2,
    },
    infoPillsContainer: {
        marginTop: -24,
        marginHorizontal: 20,
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
            android: { elevation: 4 },
            web: { boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }
        }),
    },
    infoPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 4,
    },
    infoPillText: {
        fontSize: 14,
        color: COLORS.textPrimary,
        fontWeight: '500',
    },
    menuSection: {
        marginTop: 24,
        paddingHorizontal: 20,
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 10,
        marginLeft: 4,
    },
    menuCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
            android: { elevation: 2 },
            web: { boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }
        }),
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    menuItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
    },
    menuIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    menuTextBlock: {
        flex: 1,
    },
    menuLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    menuSubtitle: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    logoutSection: {
        marginTop: 24,
        paddingHorizontal: 20,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#fff',
        borderRadius: 14,
        paddingVertical: 16,
        borderWidth: 1.5,
        borderColor: `${COLORS.error}30`,
        ...Platform.select({
            ios: { shadowColor: COLORS.error, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
            android: { elevation: 1 },
            web: { boxShadow: '0 2px 8px rgba(231,76,60,0.08)' }
        }),
    },
    logoutText: {
        color: COLORS.error,
        fontSize: 16,
        fontWeight: '700',
    },
    version: {
        textAlign: 'center',
        fontSize: 12,
        color: '#C0C0C0',
        marginTop: 20,
        marginBottom: 140,
    },
});
