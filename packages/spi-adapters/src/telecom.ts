import { getDb, schema } from '@indra/database';
import { eq, and } from 'drizzle-orm';

export interface BlockDeviceInput {
  citizenId: string;
  mobileNumber?: string;
  imei?: string;
  policeComplaintNumber?: string;
  reason: 'STOLEN' | 'LOST';
}

export interface BlockDeviceResult {
  deviceBlocked: boolean;
  imei: string;
  deviceModel: string;
  ceirTicketNumber: string;
  simBlocked: boolean;
  operator: string;
  policeAcknowledgmentReceipt: string;
}

export class TelecomSpiAdapter {
  async getActiveDevices(citizenId: string) {
    const db = await getDb();
    return db
      .select()
      .from(schema.spiTelecomRecords)
      .where(eq(schema.spiTelecomRecords.citizenId, citizenId));
  }

  async blockStolenDevice(input: BlockDeviceInput): Promise<BlockDeviceResult> {
    const db = await getDb();

    // Query active device for citizen
    const devices = await db
      .select()
      .from(schema.spiTelecomRecords)
      .where(eq(schema.spiTelecomRecords.citizenId, input.citizenId));

    if (devices.length === 0) {
      throw new Error('No registered mobile device found for citizen');
    }

    const device = devices[0];
    const ticketNo = `CEIR-IN-${Math.floor(100000 + Math.random() * 900000)}`;
    const ackNo = `POL-NCR-${Math.floor(100000 + Math.random() * 900000)}`;

    // Mark device as blocked in SPI ledger
    await db
      .update(schema.spiTelecomRecords)
      .set({
        status: 'BLOCKED',
        reportedStolenAt: new Date(),
      })
      .where(eq(schema.spiTelecomRecords.id, device.id));

    // Store police acknowledgment receipt in citizen documents
    await db.insert(schema.citizenDocuments).values({
      citizenId: input.citizenId,
      documentType: 'POLICE_LOST_REPORT',
      title: 'e-Lost Report Acknowledgment (Cyber / Telecom Cell)',
      issuer: 'State Police Department & CEIR',
      documentNumber: ackNo,
      issueDate: new Date().toISOString().split('T')[0],
      verificationStatus: 'VERIFIED',
      provenanceId: `prov_ceir_${ticketNo}`,
    });

    return {
      deviceBlocked: true,
      imei: device.imei,
      deviceModel: device.deviceModel,
      ceirTicketNumber: ticketNo,
      simBlocked: true,
      operator: device.operator,
      policeAcknowledgmentReceipt: ackNo,
    };
  }
}
