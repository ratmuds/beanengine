<script lang="ts">
    import { authStore } from "$lib/authStore";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Card from "$lib/components/ui/card/index.js";
    import * as Alert from "$lib/components/ui/alert/index.js";
    import { Loader2, Eye, EyeOff } from "lucide-svelte";

    let email = $state("");
    let password = $state("");
    let confirmPassword = $state("");
    let isSignUp = $state(false);
    let loading = $state(false);
    let error = $state("");
    let showPassword = $state(false);
    let showConfirmPassword = $state(false);

    const authState = $derived($authStore);

    onMount(() => {
        // Redirect if already authenticated
        if (authState.user) {
            goto("/projects");
        }
    });

    async function handleSubmit() {
        if (loading) return;

        error = "";

        if (!email || !password) {
            error = "Please fill in all fields";
            return;
        }

        if (isSignUp && password !== confirmPassword) {
            error = "Passwords do not match";
            return;
        }

        if (password.length < 6) {
            error = "Password must be at least 6 characters";
            return;
        }

        loading = true;

        try {
            let result;

            if (isSignUp) {
                result = await authStore.signUp(email, password);
            } else {
                result = await authStore.signIn(email, password);
            }

            if (result.error) {
                error = result.error.message;
            } else {
                // Success - redirect to projects
                goto("/projects");
            }
        } catch (err) {
            error =
                err instanceof Error
                    ? err.message
                    : "An unexpected error occurred";
        } finally {
            loading = false;
        }
    }

    function toggleMode() {
        isSignUp = !isSignUp;
        error = "";
        confirmPassword = "";
    }
</script>

<svelte:head>
    <title>{isSignUp ? "Sign Up" : "Sign In"} - Bean Engine</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center p-4">
    <Card.Root class="w-full max-w-md">
        <Card.Header class="text-center space-y-2">
            <Card.Title class="text-3xl font-bold">Bean Engine</Card.Title>
            <Card.Description class="text-lg">
                {isSignUp ? "Create your account" : "Login"}
            </Card.Description>
        </Card.Header>

        <Card.Content>
            <form on:submit|preventDefault={handleSubmit} class="space-y-4">
                <div class="space-y-2">
                    <Label for="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        bind:value={email}
                        placeholder="Enter your email"
                        required
                        disabled={loading}
                    />
                </div>

                <div class="space-y-2">
                    <Label for="password">Password</Label>
                    <div class="relative">
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            bind:value={password}
                            placeholder="Enter your password"
                            required
                            disabled={loading}
                            minlength={6}
                            class="pr-10"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            class="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onclick={() => (showPassword = !showPassword)}
                            disabled={loading}
                        >
                            {#if showPassword}
                                <EyeOff class="h-4 w-4" />
                            {:else}
                                <Eye class="h-4 w-4" />
                            {/if}
                        </Button>
                    </div>
                </div>

                {#if isSignUp}
                    <div class="space-y-2">
                        <Label for="confirmPassword">Confirm Password</Label>
                        <div class="relative">
                            <Input
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                bind:value={confirmPassword}
                                placeholder="Confirm your password"
                                required
                                disabled={loading}
                                minlength={6}
                                class="pr-10"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                class="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onclick={() =>
                                    (showConfirmPassword =
                                        !showConfirmPassword)}
                                disabled={loading}
                            >
                                {#if showConfirmPassword}
                                    <EyeOff class="h-4 w-4" />
                                {:else}
                                    <Eye class="h-4 w-4" />
                                {/if}
                            </Button>
                        </div>
                    </div>
                {/if}

                {#if error}
                    <Alert.Root variant="destructive">
                        <Alert.Description>{error}</Alert.Description>
                    </Alert.Root>
                {/if}

                <Button type="submit" class="w-full" disabled={loading}>
                    {#if loading}
                        <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                        {isSignUp ? "Creating Account..." : "Signing In..."}
                    {:else}
                        {isSignUp ? "Create Account" : "Sign In"}
                    {/if}
                </Button>
            </form>
        </Card.Content>

        <Card.Footer class="text-center">
            <p class="text-sm text-gray-600">
                {isSignUp
                    ? "Already have an account?"
                    : "Don't have an account?"}
                <Button
                    type="button"
                    variant="link"
                    class="p-0 h-auto font-semibold"
                    onclick={toggleMode}
                >
                    {isSignUp ? "Sign In" : "Sign Up"}
                </Button>
            </p>
        </Card.Footer>
    </Card.Root>
</div>
