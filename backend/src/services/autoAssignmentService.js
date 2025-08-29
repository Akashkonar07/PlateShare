const User = require('../models/user');
const Donation = require('../models/Donation');
const { sendNotification } = require('./notificationService');

class AutoAssignmentService {
  
  // Reset daily capacity counters for all NGOs
  static async resetDailyCapacity() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    await User.updateMany(
      { 
        role: 'NGO',
        'ngoCapacity.lastResetDate': { $lt: today }
      },
      {
        $set: {
          'ngoCapacity.currentDailyLoad': 0,
          'ngoCapacity.currentServingsLoad': 0,
          'ngoCapacity.lastResetDate': today
        }
      }
    );
  }

  // Check if NGO is within operating hours
  static isWithinOperatingHours(ngo) {
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                       now.getMinutes().toString().padStart(2, '0');
    
    const { start, end } = ngo.ngoCapacity.operatingHours;
    return currentTime >= start && currentTime <= end;
  }

  // Calculate NGO capacity score for prioritization
  static calculateCapacityScore(ngo, donation) {
    let score = 0;
    
    // Available capacity (higher is better)
    const donationCapacity = (ngo.ngoCapacity.maxDailyDonations - ngo.ngoCapacity.currentDailyLoad) / ngo.ngoCapacity.maxDailyDonations;
    const servingCapacity = (ngo.ngoCapacity.maxServingsPerDay - ngo.ngoCapacity.currentServingsLoad) / ngo.ngoCapacity.maxServingsPerDay;
    score += (donationCapacity + servingCapacity) * 50;
    
    // Food type preference match
    if (ngo.ngoCapacity.preferredFoodTypes.includes(donation.foodType)) {
      score += 30;
    }
    
    // Operating hours bonus
    if (this.isWithinOperatingHours(ngo)) {
      score += 20;
    }
    
    // Auto-accept preference
    if (ngo.ngoCapacity.autoAcceptBulk) {
      score += 10;
    }
    
    return score;
  }

  // Find eligible NGOs for a bulk donation
  static async findEligibleNGOs(donation) {
    await this.resetDailyCapacity();
    
    const ngos = await User.find({
      role: 'NGO',
      'ngoCapacity.isActive': true,
      'ngoCapacity.currentDailyLoad': { $lt: { $expr: '$ngoCapacity.maxDailyDonations' } },
      'ngoCapacity.currentServingsLoad': { $lt: { $expr: { $subtract: ['$ngoCapacity.maxServingsPerDay', donation.quantity] } } }
    });

    // Calculate scores and sort by priority
    const eligibleNGOs = ngos.map(ngo => ({
      ngo,
      score: this.calculateCapacityScore(ngo, donation)
    })).sort((a, b) => b.score - a.score);

    return eligibleNGOs;
  }

  // Auto-assign donation to best available NGO
  static async autoAssignBulkDonation(donationId) {
    try {
      const donation = await Donation.findById(donationId);
      if (!donation || donation.quantity < 10 || donation.status !== 'Pending') {
        return { success: false, message: 'Donation not eligible for auto-assignment' };
      }

      const eligibleNGOs = await this.findEligibleNGOs(donation);
      
      if (eligibleNGOs.length === 0) {
        return { success: false, message: 'No eligible NGOs available' };
      }

      const bestNGO = eligibleNGOs[0].ngo;
      
      // Auto-assign if NGO has auto-accept enabled
      if (bestNGO.ngoCapacity.autoAcceptBulk) {
        return await this.assignDonationToNGO(donation, bestNGO, true);
      } else {
        // Send notification and set pending assignment
        return await this.notifyNGOForAssignment(donation, bestNGO, eligibleNGOs.slice(1, 3));
      }
      
    } catch (error) {
      console.error('Auto-assignment error:', error);
      return { success: false, message: 'Auto-assignment failed', error: error.message };
    }
  }

  // Assign donation to specific NGO
  static async assignDonationToNGO(donation, ngo, autoAccepted = false) {
    // Update donation
    donation.status = 'Assigned';
    donation.assignedTo = ngo._id;
    donation.assignedAt = new Date();
    donation.autoAssigned = true;
    donation.confirmationDeadline = new Date(Date.now() + (ngo.ngoCapacity.confirmationTimeoutHours * 60 * 60 * 1000));
    
    // Add tracking entry
    donation.trackingHistory = donation.trackingHistory || [];
    donation.trackingHistory.push({
      status: 'Assigned',
      timestamp: new Date(),
      updatedBy: ngo._id,
      notes: autoAccepted ? 'Auto-assigned and accepted' : 'Auto-assigned, pending confirmation'
    });
    
    await donation.save();

    // Update NGO capacity
    ngo.ngoCapacity.currentDailyLoad += 1;
    ngo.ngoCapacity.currentServingsLoad += donation.quantity;
    await ngo.save();

    // Send notification
    await sendNotification(ngo._id, {
      type: autoAccepted ? 'DONATION_AUTO_ACCEPTED' : 'DONATION_ASSIGNED',
      title: autoAccepted ? 'Donation Auto-Accepted' : 'New Donation Assignment',
      message: `Bulk donation of ${donation.quantity} servings has been ${autoAccepted ? 'automatically accepted' : 'assigned to you'}`,
      donationId: donation._id,
      priority: 'high'
    });

    return {
      success: true,
      message: autoAccepted ? 'Donation auto-assigned and accepted' : 'Donation assigned, awaiting confirmation',
      donation,
      assignedNGO: ngo._id,
      autoAccepted
    };
  }

  // Notify NGO about assignment with fallback options
  static async notifyNGOForAssignment(donation, primaryNGO, fallbackNGOs) {
    const result = await this.assignDonationToNGO(donation, primaryNGO, false);
    
    // Schedule timeout check
    setTimeout(async () => {
      await this.checkConfirmationTimeout(donation._id);
    }, primaryNGO.ngoCapacity.confirmationTimeoutHours * 60 * 60 * 1000);

    // Notify fallback NGOs
    for (const fallback of fallbackNGOs) {
      await sendNotification(fallback.ngo._id, {
        type: 'DONATION_FALLBACK_AVAILABLE',
        title: 'Backup Donation Available',
        message: `A bulk donation may become available if primary NGO doesn't confirm`,
        donationId: donation._id,
        priority: 'medium'
      });
    }

    return result;
  }

  // Check if NGO confirmed within timeout, reassign if not
  static async checkConfirmationTimeout(donationId) {
    try {
      const donation = await Donation.findById(donationId).populate('assignedTo');
      
      if (!donation || donation.status !== 'Assigned') {
        return; // Already confirmed or status changed
      }

      if (new Date() > donation.confirmationDeadline) {
        console.log(`NGO ${donation.assignedTo.name} failed to confirm donation ${donationId} within timeout`);
        
        // Reset donation status
        donation.status = 'Pending';
        const previousNGO = donation.assignedTo;
        donation.assignedTo = null;
        donation.assignedAt = null;
        donation.confirmationDeadline = null;
        
        // Add timeout tracking entry
        donation.trackingHistory.push({
          status: 'Timeout',
          timestamp: new Date(),
          updatedBy: previousNGO._id,
          notes: `Assignment timeout - reassigning to next available NGO`
        });
        
        await donation.save();

        // Reset NGO capacity
        await User.findByIdAndUpdate(previousNGO._id, {
          $inc: {
            'ngoCapacity.currentDailyLoad': -1,
            'ngoCapacity.currentServingsLoad': -donation.quantity
          }
        });

        // Notify original NGO of timeout
        await sendNotification(previousNGO._id, {
          type: 'ASSIGNMENT_TIMEOUT',
          title: 'Assignment Timeout',
          message: `Donation assignment expired due to lack of confirmation`,
          donationId: donation._id,
          priority: 'high'
        });

        // Try to reassign to next available NGO
        const reassignResult = await this.autoAssignBulkDonation(donationId);
        console.log('Reassignment result:', reassignResult);
      }
    } catch (error) {
      console.error('Timeout check error:', error);
    }
  }

  // Manual confirmation by NGO
  static async confirmAssignment(donationId, ngoId) {
    try {
      const donation = await Donation.findById(donationId);
      
      if (!donation || donation.assignedTo.toString() !== ngoId.toString()) {
        return { success: false, message: 'Invalid assignment confirmation' };
      }

      if (donation.status !== 'Assigned') {
        return { success: false, message: 'Donation not in assigned status' };
      }

      // Mark as confirmed (remove deadline)
      donation.confirmationDeadline = null;
      donation.trackingHistory.push({
        status: 'Confirmed',
        timestamp: new Date(),
        updatedBy: ngoId,
        notes: 'Assignment confirmed by NGO'
      });
      
      await donation.save();

      return { success: true, message: 'Assignment confirmed successfully', donation };
    } catch (error) {
      console.error('Confirmation error:', error);
      return { success: false, message: 'Confirmation failed', error: error.message };
    }
  }
}

module.exports = AutoAssignmentService;
