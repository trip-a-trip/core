import { Injectable } from '@nestjs/common';
import { chain } from 'lodash';
import { getDistance } from 'geolib';

import { Coordinates } from './Coordinates';
import { Venue } from './Venue.entity';
import { Seen } from './Seen.entity';
import { HistoryFinder } from '../infrastructure/HistoryFinder';
import { VenueFinder } from '../infrastructure/VenueFinder';

const DISTANCE_THRESHOLD_IN_METERS = 2000;

@Injectable()
export class VenueChoicer {
  constructor(
    private readonly history: HistoryFinder,
    private readonly store: VenueFinder,
  ) {}

  async choice(
    userId: string,
    coordinates: Coordinates,
  ): Promise<Venue | null> {
    const venues = await this.store.findAll();

    return this.findVenue(coordinates, venues);
  }

  private findVenue(
    coordinates: Coordinates,
    venues: Venue[],
    seenVenues: Seen[] = [],
  ): Venue | null {
    return (
      chain(venues)
        .filter((venue) => this.filterByDistance(venue, coordinates))
        .differenceWith(seenVenues, (venue, seen) => venue.id === seen.venueId)
        .sortBy((venue) => this.getProductivity(venue, coordinates))
        // TODO: add filter by time of day
        .first()
        .value()
    );
  }

  private getProductivity(venue: Venue, coordinates: Coordinates): number {
    const baseProductivity =
      DISTANCE_THRESHOLD_IN_METERS -
      getDistance(venue.coordinates, coordinates);
    const amazingMultiplier = venue.isAmazing ? 2 : 1;
    const expensiveMultiplier = venue.isExpensive ? 0.8 : 1;

    return baseProductivity * amazingMultiplier * expensiveMultiplier;
  }

  private filterByDistance(venue: Venue, coordinates: Coordinates): boolean {
    return (
      getDistance(venue.coordinates, coordinates) < DISTANCE_THRESHOLD_IN_METERS
    );
  }
}
