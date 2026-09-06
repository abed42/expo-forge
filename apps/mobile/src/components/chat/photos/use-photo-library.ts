import {
	AssetField,
	MediaType,
	type PermissionResponse,
	Query,
	usePermissions,
} from "expo-media-library";
import { useCallback, useEffect, useState } from "react";

/** How many library assets to pull in. */
const PAGE_SIZE = 180;

export interface LibraryPhoto {
	/**
	 * `ph://<localIdentifier>` on iOS, a `content://` uri on Android — both of
	 * which `expo-image` loads directly, so this doubles as the image source.
	 */
	id: string;
}

export type LibraryStatus = "loading" | "denied" | "empty" | "ready";

export interface PhotoLibrary {
	photos: LibraryPhoto[];
	status: LibraryStatus;
}

function isReadable(permission: PermissionResponse | null) {
	return (
		!!permission &&
		(permission.granted || permission.accessPrivileges === "limited")
	);
}

/**
 * The most recent photos from the device library, newest first.
 *
 * `exeForMetadata()` reads straight from the media store without resolving
 * file paths, so a full page comes back in one call and the id it returns is
 * already a loadable uri.
 *
 * Nothing is asked for until `enabled` — the permission prompt belongs to
 * the moment the grid opens, not to the tab (or, under native tabs, the app)
 * mounting.
 */
export function usePhotoLibrary(enabled: boolean): PhotoLibrary {
	const [permission, requestPermission] = usePermissions({
		granularPermissions: ["photo"],
		// `get` only reads the current status; the request is made below.
		get: enabled,
		request: false,
	});
	const [photos, setPhotos] = useState<LibraryPhoto[]>([]);
	const [status, setStatus] = useState<LibraryStatus>("loading");

	const load = useCallback(async () => {
		try {
			const assets = await new Query()
				.eq(AssetField.MEDIA_TYPE, MediaType.IMAGE)
				.orderBy({ key: AssetField.CREATION_TIME, ascending: false })
				.limit(PAGE_SIZE)
				.exeForMetadata();

			setPhotos(assets.map((asset) => ({ id: asset.id })));
			setStatus(assets.length ? "ready" : "empty");
		} catch {
			setStatus("denied");
		}
	}, []);

	// Ask once, the first time the grid opens — it has nothing to show without.
	useEffect(() => {
		if (
			enabled &&
			permission &&
			!permission.granted &&
			permission.canAskAgain
		) {
			requestPermission();
		}
	}, [enabled, permission, requestPermission]);

	useEffect(() => {
		if (!enabled || !permission) {
			return;
		}
		if (isReadable(permission)) {
			load();
		} else if (!permission.canAskAgain) {
			setStatus("denied");
		}
	}, [enabled, permission, load]);

	return { photos, status };
}
