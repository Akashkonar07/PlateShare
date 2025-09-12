const mongoose = require('mongoose');
const User = require('../models/user');
const VolunteerProfile = require('../models/VolunteerProfile');
require('dotenv').config();

/**
 * Migration script to update existing users with new profile structure
 * This ensures backward compatibility when new profile fields are added
 */

const migrateUserProfiles = async () => {
  try {
    console.log('🚀 Starting user profile migration...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plateshare');
    console.log('✅ Connected to MongoDB');

    // Get all users
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users to migrate`);

    let migratedCount = 0;
    let volunteerProfilesCreated = 0;

    for (const user of users) {
      let needsUpdate = false;
      const updates = {};

      // Initialize profile structure if missing
      if (!user.profile) {
        updates.profile = {
          phone: '',
          address: {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            coordinates: {
              latitude: null,
              longitude: null
            }
          },
          avatar: '',
          bio: '',
          preferences: {
            notifications: {
              email: true,
              push: true,
              sms: false
            },
            privacy: {
              showProfile: true,
              showLocation: true,
              showStats: true
            }
          }
        };
        needsUpdate = true;
      }

      // Initialize NGO capacity for NGO users
      if (user.role === 'NGO' && !user.ngoCapacity) {
        updates.ngoCapacity = {
          dailyCapacity: 0,
          currentLoad: 0,
          maxBulkSize: 100,
          operatingHours: {
            start: '09:00',
            end: '18:00'
          },
          workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          foodPreferences: [],
          serviceRadius: 10,
          reliabilityScore: 100,
          performanceMetrics: {
            totalConfirmed: 0,
            totalAssigned: 0,
            avgConfirmationTime: 0,
            lastResetDate: new Date()
          }
        };
        needsUpdate = true;
      }

      // Initialize volunteer preferences for Volunteer users
      if (user.role === 'Volunteer' && !user.volunteerPreferences) {
        updates.volunteerPreferences = {
          maxDistance: 15,
          availableHours: {
            start: '09:00',
            end: '18:00'
          },
          availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          vehicleType: 'Car',
          maxCapacity: 5
        };
        needsUpdate = true;
      }

      // Initialize activity tracking fields if missing
      if (!user.lastLoginAt) {
        updates.lastLoginAt = user.createdAt || new Date();
        needsUpdate = true;
      }

      if (!user.loginCount) {
        updates.loginCount = 1;
        needsUpdate = true;
      }

      if (!user.lastActiveAt) {
        updates.lastActiveAt = user.createdAt || new Date();
        needsUpdate = true;
      }

      // Initialize account status fields if missing
      if (user.isActive === undefined) {
        updates.isActive = true;
        needsUpdate = true;
      }

      // Update user if needed
      if (needsUpdate) {
        await User.findByIdAndUpdate(user._id, { $set: updates });
        migratedCount++;
        console.log(`✅ Migrated user: ${user.email} (${user.role})`);
      }

      // Create VolunteerProfile for volunteers if it doesn't exist
      if (user.role === 'Volunteer') {
        const existingProfile = await VolunteerProfile.findOne({ user: user._id });
        if (!existingProfile) {
          await VolunteerProfile.create({
            user: user._id,
            totalPoints: user.points || 0,
            stats: {
              joinedDate: user.createdAt || new Date()
            }
          });
          volunteerProfilesCreated++;
          console.log(`✅ Created VolunteerProfile for: ${user.email}`);
        }
      }
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log(`📊 Migration Summary:`);
    console.log(`   - Total users processed: ${users.length}`);
    console.log(`   - Users migrated: ${migratedCount}`);
    console.log(`   - Volunteer profiles created: ${volunteerProfilesCreated}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run migration if this script is executed directly
if (require.main === module) {
  migrateUserProfiles();
}

module.exports = migrateUserProfiles;
