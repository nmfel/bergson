import { db } from '../db/database';
import { 
  pageRepository, 
  blockRepository, 
  imageRepository, 
  wikipediaRepository, 
  preferenceRepository 
} from '../db/repositories';

export const useDatabase = () => {
  return {
    db,
    pageRepository,
    blockRepository,
    imageRepository,
    wikipediaRepository,
    preferenceRepository
  };
};
