import console from "console";
import { formatPhoneWA } from "./Helper";

export default class Group {
  sock: any;
  constructor(params) {}

  create(name: string, phones: string[]) {
    phones.forEach((phone, index) => {
      phones[index] = formatPhoneWA(phone);
    });
    console.log(phones);
    // this.sock.groupCreate("My Fab Group", phones);
  }

  update(name: string, phones: string[]) {
    this.sock.groupParticipantsUpdate(
      "abcd-xyz@g.us",
      ["abcd@s.whatsapp.net", "efgh@s.whatsapp.net"],
      "add" // replace this parameter with "remove", "demote" or "promote"
    );
  }

  changeSubject(name: string, subject: string) {
    this.sock.groupUpdateSubject("abcd-xyz@g.us", "New Subject!");
  }

  changeDescription(name: string, description: string) {
    this.sock.groupUpdateDescription("abcd-xyz@g.us", "New Description!");
  }

  setting(name: string, setting: string) {
    // hanya izinkan admin untuk mengirim pesan
    this.sock.groupSettingUpdate("abcd-xyz@g.us", "announcement");
    // izinkan semua orang mengirim pesan
    this.sock.groupSettingUpdate("abcd-xyz@g.us", "not_announcement");
    // izinkan semua orang untuk mengubah pengaturan grup -- seperti gambar tampilan, dll.
    this.sock.groupSettingUpdate("abcd-xyz@g.us", "unlocked");
    // hanya izinkan admin untuk mengubah pengaturan grup
    this.sock.groupSettingUpdate("abcd-xyz@g.us", "locked");
  }

  leave(name: string) {
    this.sock.groupLeave("abcd-xyz@g.us");
  }

  getInviteCode(name: string): string {
    return this.sock.groupInviteCode("abcd-xyz@g.us");
  }

  // Untuk mencabut kode undangan dalam grup
  revokeInviteCode(name: string) {
    this.sock.groupRevokeInvite("abcd-xyz@g.us");
  }

  getMetadata() {
    return this.sock.groupMetadata("abcd-xyz@g.us");
  }

  acceptInviteCode(inviteCode: string) {
    return this.sock.groupAcceptInvite(inviteCode);
  }

  async getGroupWithParticipants() {
    return await this.sock.groupFetchAllParticipating();
  }

  async getGroupList() {
    return await this.sock.getAllGroupIds();
  }
}
