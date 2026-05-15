import { DomainValidationError } from '../error/domain-validation.error';

export type CreateStationData = ReturnType<typeof Station.createNew>;

export type UpdateStationData = {
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
  connectorsTotal?: number;
  maxKwThreshold?: number;
  pricePerKwh?: number;
  enabled?: boolean;
};

export class Station {
  private constructor(
    readonly id: string,
    readonly name: string,
    readonly address: string,
    readonly lat: number,
    readonly lng: number,
    readonly connectorsTotal: number,
    readonly maxKwThreshold: number,
    readonly pricePerKwh: number,
    readonly enabled: boolean,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  static createNew(input: {
    name: string;
    address: string;
    lat: number;
    lng: number;
    connectorsTotal: number;
    maxKwThreshold: number;
    pricePerKwh: number;
    enabled: boolean;
  }) {
    return {
      name: Station.validateName(input.name),
      address: Station.validateAddress(input.address),
      lat: Station.validateCoordinate(input.lat, 'lat'),
      lng: Station.validateCoordinate(input.lng, 'lng'),
      connectorsTotal: Station.validateConnectorsTotal(input.connectorsTotal),
      maxKwThreshold: Station.validateMaxKwThreshold(input.maxKwThreshold),
      pricePerKwh: Station.validatePricePerKwh(input.pricePerKwh),
      enabled: input.enabled,
    };
  }

  static reconstitute(props: {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    connectorsTotal: number;
    maxKwThreshold: number;
    pricePerKwh: number;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): Station {
    return new Station(
      props.id,
      props.name,
      props.address,
      props.lat,
      props.lng,
      props.connectorsTotal,
      props.maxKwThreshold,
      props.pricePerKwh,
      props.enabled,
      props.createdAt,
      props.updatedAt,
    );
  }

  static validateUpdate(input: UpdateStationData): UpdateStationData {
    const result: UpdateStationData = {};
    if (input.name !== undefined) {
      result.name = Station.validateName(input.name);
    }
    if (input.address !== undefined) {
      result.address = Station.validateAddress(input.address);
    }
    if (input.lat !== undefined) {
      result.lat = Station.validateCoordinate(input.lat, 'lat');
    }
    if (input.lng !== undefined) {
      result.lng = Station.validateCoordinate(input.lng, 'lng');
    }
    if (input.connectorsTotal !== undefined) {
      result.connectorsTotal = Station.validateConnectorsTotal(input.connectorsTotal);
    }
    if (input.maxKwThreshold !== undefined) {
      result.maxKwThreshold = Station.validateMaxKwThreshold(input.maxKwThreshold);
    }
    if (input.pricePerKwh !== undefined) {
      result.pricePerKwh = Station.validatePricePerKwh(input.pricePerKwh);
    }
    if (input.enabled !== undefined) {
      result.enabled = input.enabled;
    }
    return result;
  }

  private static validateName(name: string): string {
    if (!name?.trim()) {
      throw new DomainValidationError('Station name is required');
    }
    return name.trim();
  }

  private static validateAddress(address: string): string {
    if (!address?.trim()) {
      throw new DomainValidationError('Station address is required');
    }
    return address.trim();
  }

  private static validateCoordinate(value: number, field: string): number {
    if (Number.isNaN(value)) {
      throw new DomainValidationError(`${field} must be a valid number`);
    }
    return value;
  }

  private static validateConnectorsTotal(connectorsTotal: number): number {
    if (connectorsTotal <= 0) {
      throw new DomainValidationError('Connectors total must be greater than zero');
    }
    return connectorsTotal;
  }

  private static validateMaxKwThreshold(maxKwThreshold: number): number {
    if (maxKwThreshold <= 0) {
      throw new DomainValidationError('Max kW threshold must be greater than zero');
    }
    return maxKwThreshold;
  }

  private static validatePricePerKwh(pricePerKwh: number): number {
    if (pricePerKwh <= 0) {
      throw new DomainValidationError('Price per kWh must be greater than zero');
    }
    return pricePerKwh;
  }
}
