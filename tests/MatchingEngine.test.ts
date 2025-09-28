import { describe, it, expect, beforeEach } from "vitest";
import { stringAsciiCV, uintCV } from "@stacks/transactions";

const ERR_NO_MATCH = 100;
const ERR_INVALID_BLOOD_TYPE = 101;
const ERR_INVALID_LOCATION = 102;
const ERR_INVALID_RADIUS = 103;
const ERR_INVALID_URGENCY = 107;
const ERR_INVALID_PRIORITY = 114;
const ERR_INVALID_QUANTITY = 115;
const ERR_INVALID_COMPATIBILITY = 116;
const ERR_AUTHORITY_NOT_SET = 117;
const ERR_MAX_MATCHES_EXCEEDED = 111;
const ERR_ALREADY_MATCHED = 106;
const ERR_NOT_AUTHORIZED = 109;
const ERR_INVALID_MATCH_ID = 119;

interface Match {
  donorPrincipal: string;
  needId: number;
  bloodType: string;
  location: string;
  radius: number;
  urgency: number;
  timestamp: number;
  status: boolean;
  priority: number;
  quantity: number;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class MatchingEngineMock {
  state: {
    lastMatchId: number;
    maxMatches: number;
    matchFee: number;
    authorityContract: string | null;
    matches: Map<number, Match>;
    donorMatches: Map<string, number[]>;
    needMatches: Map<number, number[]>;
  } = {
    lastMatchId: 0,
    maxMatches: 10000,
    matchFee: 100,
    authorityContract: null,
    matches: new Map(),
    donorMatches: new Map(),
    needMatches: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      lastMatchId: 0,
      maxMatches: 10000,
      matchFee: 100,
      authorityContract: null,
      matches: new Map(),
      donorMatches: new Map(),
      needMatches: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.stxTransfers = [];
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (contractPrincipal === "SP000000000000000000002Q6VF78") {
      return { ok: false, value: false };
    }
    if (this.state.authorityContract !== null) {
      return { ok: false, value: false };
    }
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setMatchFee(newFee: number): Result<boolean> {
    if (!this.state.authorityContract) return { ok: false, value: false };
    this.state.matchFee = newFee;
    return { ok: true, value: true };
  }

  createMatch(
    donor: string,
    need: number,
    bloodType: string,
    location: string,
    radius: number,
    urgency: number,
    priority: number,
    quantity: number,
    needBt: string
  ): Result<number> {
    if (this.state.lastMatchId >= this.state.maxMatches) return { ok: false, value: ERR_MAX_MATCHES_EXCEEDED };
    if (!["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].includes(bloodType)) return { ok: false, value: ERR_INVALID_BLOOD_TYPE };
    if (!location || location.length > 50) return { ok: false, value: ERR_INVALID_LOCATION };
    if (radius <= 0 || radius > 1000) return { ok: false, value: ERR_INVALID_RADIUS };
    if (urgency > 10) return { ok: false, value: ERR_INVALID_URGENCY };
    if (priority > 5) return { ok: false, value: ERR_INVALID_PRIORITY };
    if (quantity <= 0) return { ok: false, value: ERR_INVALID_QUANTITY };
    if (!this.isCompatible(bloodType, needBt)) return { ok: false, value: ERR_INVALID_COMPATIBILITY };
    if (!this.state.authorityContract) return { ok: false, value: ERR_AUTHORITY_NOT_SET };

    this.stxTransfers.push({ amount: this.state.matchFee, from: this.caller, to: this.state.authorityContract });

    const id = this.state.lastMatchId;
    const match: Match = {
      donorPrincipal: donor,
      needId: need,
      bloodType,
      location,
      radius,
      urgency,
      timestamp: this.blockHeight,
      status: true,
      priority,
      quantity,
    };
    this.state.matches.set(id, match);
    const donorMs = this.state.donorMatches.get(donor) || [];
    if (donorMs.includes(id)) return { ok: false, value: ERR_ALREADY_MATCHED };
    donorMs.push(id);
    this.state.donorMatches.set(donor, donorMs);
    const needMs = this.state.needMatches.get(need) || [];
    if (needMs.includes(id)) return { ok: false, value: ERR_ALREADY_MATCHED };
    needMs.push(id);
    this.state.needMatches.set(need, needMs);
    this.state.lastMatchId++;
    return { ok: true, value: id };
  }

  isCompatible(donorBt: string, needBt: string): boolean {
    if (donorBt === needBt) return true;
    if (donorBt === "O-") return true;
    if (donorBt === "O+" && ["O+", "A+", "B+", "AB+"].includes(needBt)) return true;
    if (donorBt === "A-" && ["A-", "A+", "AB-", "AB+"].includes(needBt)) return true;
    if (donorBt === "A+" && ["A+", "AB+"].includes(needBt)) return true;
    if (donorBt === "B-" && ["B-", "B+", "AB-", "AB+"].includes(needBt)) return true;
    if (donorBt === "B+" && ["B+", "AB+"].includes(needBt)) return true;
    if (donorBt === "AB-" && ["AB-", "AB+"].includes(needBt)) return true;
    if (donorBt === "AB+" && needBt === "AB+") return true;
    return false;
  }

  getMatch(id: number): Match | null {
    return this.state.matches.get(id) || null;
  }

  updateMatchStatus(id: number, newStatus: boolean): Result<boolean> {
    const match = this.state.matches.get(id);
    if (!match) return { ok: false, value: false };
    if (match.donorPrincipal !== this.caller) return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.matches.set(id, { ...match, status: newStatus, timestamp: this.blockHeight });
    return { ok: true, value: true };
  }

  getMatchCount(): Result<number> {
    return { ok: true, value: this.state.lastMatchId };
  }
}

describe("MatchingEngine", () => {
  let contract: MatchingEngineMock;

  beforeEach(() => {
    contract = new MatchingEngineMock();
    contract.reset();
  });

  it("creates a match successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createMatch(
      "ST3DONOR",
      1,
      "O+",
      "CityA",
      50,
      5,
      3,
      2,
      "A+"
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);

    const match = contract.getMatch(0);
    expect(match?.donorPrincipal).toBe("ST3DONOR");
    expect(match?.needId).toBe(1);
    expect(match?.bloodType).toBe("O+");
    expect(match?.location).toBe("CityA");
    expect(match?.radius).toBe(50);
    expect(match?.urgency).toBe(5);
    expect(match?.priority).toBe(3);
    expect(match?.quantity).toBe(2);
    expect(contract.stxTransfers).toEqual([{ amount: 100, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects incompatible blood types", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createMatch(
      "ST3DONOR",
      1,
      "A+",
      "CityA",
      50,
      5,
      3,
      2,
      "B+"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_COMPATIBILITY);
  });

  it("rejects without authority contract", () => {
    const result = contract.createMatch(
      "ST3DONOR",
      1,
      "O+",
      "CityA",
      50,
      5,
      3,
      2,
      "A+"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_AUTHORITY_NOT_SET);
  });

  it("rejects invalid blood type", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createMatch(
      "ST3DONOR",
      1,
      "X+",
      "CityA",
      50,
      5,
      3,
      2,
      "A+"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_BLOOD_TYPE);
  });

  it("updates match status successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createMatch(
      "ST1TEST",
      1,
      "O+",
      "CityA",
      50,
      5,
      3,
      2,
      "O+"
    );
    const result = contract.updateMatchStatus(0, false);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const match = contract.getMatch(0);
    expect(match?.status).toBe(false);
  });

  it("rejects update by non-donor", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createMatch(
      "ST3DONOR",
      1,
      "O+",
      "CityA",
      50,
      5,
      3,
      2,
      "O+"
    );
    const result = contract.updateMatchStatus(0, false);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("sets match fee successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.setMatchFee(200);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.matchFee).toBe(200);
  });

  it("returns correct match count", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createMatch(
      "ST3DONOR",
      1,
      "O+",
      "CityA",
      50,
      5,
      3,
      2,
      "A+"
    );
    contract.createMatch(
      "ST4DONOR",
      2,
      "AB-",
      "CityB",
      100,
      8,
      1,
      5,
      "AB-"
    );
    const result = contract.getMatchCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("rejects max matches exceeded", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.state.maxMatches = 1;
    contract.createMatch(
      "ST3DONOR",
      1,
      "O+",
      "CityA",
      50,
      5,
      3,
      2,
      "A+"
    );
    const result = contract.createMatch(
      "ST4DONOR",
      2,
      "AB-",
      "CityB",
      100,
      8,
      1,
      5,
      "AB-"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_MATCHES_EXCEEDED);
  });
});