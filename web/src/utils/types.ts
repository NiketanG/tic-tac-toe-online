export type SearchResponse = {
	result: "fail" | "success";
	online: number;
};

export type GameExistsResponse = {
	online: number;
	gameExists: boolean;
};
