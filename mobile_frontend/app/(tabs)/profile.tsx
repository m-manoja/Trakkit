import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, Alert, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../src/theme/colors';
import { useAuth } from '../../src/context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../src/components/Header';

const { width, height } = Dimensions.get('window');

export default function ProfileScreen() {
    const { user, signOut } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        Alert.alert(
            "Confirm Logout",
            "Are you sure you want to logout?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Logout",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await signOut();
                            router.replace("/");
                        } catch (e) {
                            console.error("Logout failed:", e);
                            Alert.alert("Error", "Failed to logout");
                        }
                    },
                },
            ]
        );
    };

    const handleEditProfile = () => {
        router.push("/(tabs)/profile_setup");
    };

    const menuItems = [
        {
            icon: 'person-outline' as keyof typeof Ionicons.glyphMap,
            label: 'Edit Profile',
            onPress: handleEditProfile,
            color: COLORS.primary
        },
        {
            icon: 'settings-outline' as keyof typeof Ionicons.glyphMap,
            label: 'Settings',
            onPress: () => Alert.alert('Settings', 'Coming soon!'),
            color: '#8E8E93'
        },
        {
            icon: 'notifications-outline' as keyof typeof Ionicons.glyphMap,
            label: 'Notifications',
            onPress: () => Alert.alert('Notifications', 'Coming soon!'),
            color: '#FF9500'
        },
        {
            icon: 'shield-checkmark-outline' as keyof typeof Ionicons.glyphMap,
            label: 'Privacy Policy',
            onPress: () => Alert.alert('Privacy Policy', 'Coming soon!'),
            color: '#34C759'
        },
        {
            icon: 'help-circle-outline' as keyof typeof Ionicons.glyphMap,
            label: 'Help & Support',
            onPress: () => Alert.alert('Help & Support', 'Coming soon!'),
            color: '#007AFF'
        },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <Header title="Profile" showBackButton={true} />

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Profile Header */}
                <View style={styles.profileHeader}>
                    <View style={styles.profileTop}>
                        <View style={styles.avatarContainer}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {(user as any)?.firstName ? (user as any).firstName[0].toUpperCase() : 'U'}
                                </Text>
                            </View>
                            <TouchableOpacity style={styles.editAvatarButton} onPress={handleEditProfile}>
                                <Ionicons name="camera" size={16} color="white" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>
                                {(user as any)?.firstName ? `${(user as any)?.firstName} ${(user as any)?.lastName || ''}`.trim() : 'User'}
                            </Text>
                            <Text style={styles.profilePhone}>{(user as any)?.phone}</Text>
                            <Text style={styles.profileEmail}>{(user as any)?.email || 'No email set'}</Text>
                        </View>
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.menuSection}>
                    <Text style={styles.sectionTitle}>Account Settings</Text>
                    <View style={styles.menuList}>
                        {menuItems.map((item, index) => (
                            <TouchableOpacity key={index} style={styles.menuItem} onPress={item.onPress}>
                                <View style={[styles.menuIcon, { backgroundColor: `${item.color}15` }]}>
                                    <Ionicons name={item.icon} size={20} color={item.color} />
                                </View>
                                <Text style={styles.menuLabel}>{item.label}</Text>
                                <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Logout Button */}
                <View style={styles.logoutSection}>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={18} color="#FFF" />
                        <Text style={styles.logoutText}>Sign Out</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        padding: 0,
        paddingBottom: 100,
    },
    profileHeader: {
        backgroundColor: '#F8F9FA',
        paddingTop: 20,
        paddingBottom: 30,
        paddingHorizontal: 20,
    },
    profileTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatarContainer: {
        marginRight: 20,
        position: 'relative',
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#FFF',
    },
    avatarText: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#FFF',
    },
    editAvatarButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileInfo: {
        flex: 1,
        alignItems: 'flex-start',
    },
    profileName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 6,
        textAlign: 'left',
    },
    profilePhone: {
        fontSize: 16,
        color: COLORS.textSecondary,
        marginBottom: 4,
        textAlign: 'left',
    },
    profileEmail: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'left',
    },
    profileStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: '#FFF',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 20,
        elevation: 1,
        ...Platform.select({
            web: {
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
            }
        }),
    },
    statItem: {
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        backgroundColor: '#E0E0E0',
        marginHorizontal: 20,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    menuSection: {
        backgroundColor: '#FFF',
        marginTop: 20,
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 16,
    },
    menuList: {
        backgroundColor: '#FFF',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    menuIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    menuLabel: {
        flex: 1,
        fontSize: 16,
        color: COLORS.textPrimary,
        fontWeight: '500',
    },
    logoutSection: {
        marginTop: 40,
        paddingHorizontal: 20,
        paddingBottom: 60,
    },
    logoutButton: {
        backgroundColor: '#FF3B30',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        width: '100%',
        borderWidth: 1,
        borderColor: '#FF3B30',
    },
    logoutText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    }
});
