#import "AppDelegate.h"
#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>
#import <GoogleMaps/GoogleMaps.h>
#import <Firebase.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application
    didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
    // Google Maps — replace with your key
    [GMSServices provideAPIKey:@"YOUR_GOOGLE_MAPS_API_KEY"];

    // Firebase — requires GoogleService-Info.plist in ios/SlotPro/
    [FIRApp configure];

    self.moduleName = @"SlotPro";
    self.initialProps = @{};

    return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge { return [self bundleURL]; }

- (NSURL *)bundleURL
{
#if DEBUG
    return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
    return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

// Deep links: slotpro://job/123
- (BOOL)application:(UIApplication *)application openURL:(NSURL *)url
    options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options
{
    return [RCTLinkingManager application:application openURL:url options:options];
}

- (BOOL)application:(UIApplication *)application
    continueUserActivity:(NSUserActivity *)userActivity
    restorationHandler:(void (^)(NSArray<id<UIUserActivityRestoring>> *))restorationHandler
{
    return [RCTLinkingManager application:application continueUserActivity:userActivity
        restorationHandler:restorationHandler];
}

// APNS token → Firebase FCM
- (void)application:(UIApplication *)application
    didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken
{
    [FIRMessaging messaging].APNSToken = deviceToken;
}

@end
