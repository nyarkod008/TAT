import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_ID_KEY = 'knust_user_id';
const USER_NAME_KEY = 'knust_user_name';

/** Simple RFC4122-ish v4 UUID without needing the native crypto module. */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getLocalUserId(): Promise<string> {
  let id = await AsyncStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = generateId();
    await AsyncStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

export async function getLocalUserName(): Promise<string> {
  return (await AsyncStorage.getItem(USER_NAME_KEY)) ?? '';
}

export async function setLocalUserName(name: string): Promise<void> {
  await AsyncStorage.setItem(USER_NAME_KEY, name);
}
