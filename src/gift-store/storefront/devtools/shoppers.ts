import type { ShippingAddress } from '@gift-store/commerce';

/**
 * Mock shoppers used ONLY by the dev panel to fill the checkout's shipping form.
 * Lives in devtools/ so this test data never leaks into the checkout feature code.
 */

/** The deterministic default used on first load (keeps the demo stable for tests). */
export const defaultShopper: ShippingAddress = {
  fullName: 'Ada Lovelace',
  line1: '12 Toggle Lane',
  city: 'Flagtown',
  postalCode: 'FF1 0NN',
  country: 'United Kingdom',
};

export const shoppers: ShippingAddress[] = [
  defaultShopper,
  {
    fullName: 'Grace Hopper',
    line1: '7 Nanosecond Way',
    city: 'Compiler City',
    postalCode: 'CO 80401',
    country: 'United States',
  },
  {
    fullName: 'Alan Turing',
    line1: '1 Enigma Court',
    city: 'Bletchley',
    postalCode: 'MK3 6EB',
    country: 'United Kingdom',
  },
  {
    fullName: 'Katherine Johnson',
    line1: '34 Orbit Road',
    city: 'Hampton',
    postalCode: 'VA 23666',
    country: 'United States',
  },
  {
    fullName: 'Margaret Hamilton',
    line1: '88 Apollo Street',
    city: 'Cambridge',
    postalCode: 'MA 02139',
    country: 'United States',
  },
  {
    fullName: 'Linus Torvalds',
    line1: '5 Kernel Close',
    city: 'Helsinki',
    postalCode: '00100',
    country: 'Finland',
  },
  {
    fullName: 'Barbara Liskov',
    line1: '21 Substitution Avenue',
    city: 'Palo Alto',
    postalCode: 'CA 94301',
    country: 'United States',
  },
  {
    fullName: 'Dennis Ritchie',
    line1: '9 Pointer Place',
    city: 'Murray Hill',
    postalCode: 'NJ 07974',
    country: 'United States',
  },
];

/** Pick a random shopper to drop into the shipping form when filling a basket. */
export const pickRandomShopper = (): ShippingAddress =>
  shoppers[Math.floor(Math.random() * shoppers.length)] ?? defaultShopper;
