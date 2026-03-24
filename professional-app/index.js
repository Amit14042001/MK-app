/**
 * Slot Professional App — Entry Point
 */
import { AppRegistry, LogBox } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

LogBox.ignoreLogs(['Non-serializable values', 'VirtualizedLists']);

AppRegistry.registerComponent(appName, () => App);
